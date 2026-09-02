import { inject, Service } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { AnyEndpoint, EndpointParams, EndpointQuery, EndpointRequest, EndpointResponse, METHODS_WITH_BODY } from '@gandogames/shared/dto';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { ToastService } from '@gandogames/services';

/**
 * Options for a call, derived from its endpoint definition: `params` is present (and typed)
 * only when the route template has `{param}` segments, `body` only when the endpoint declares
 * a request type, `query` only when it declares a query-string type.
 */
type CallOptions<E extends AnyEndpoint> =
	(keyof EndpointParams<E> extends never ? unknown : { params: EndpointParams<E> }) &
	([EndpointRequest<E>] extends [void] ? unknown : { body: EndpointRequest<E> }) &
	([EndpointQuery<E>] extends [void] ? unknown : { query: EndpointQuery<E> });

/** `call(endpoint)` when the endpoint needs no input, `call(endpoint, options)` otherwise. */
type CallArgs<E extends AnyEndpoint> = unknown extends CallOptions<E> ? [] : [CallOptions<E>];

@Service()
export class BackendService {
	private readonly http = inject(HttpClient);
	private readonly toast = inject(ToastService);
	private readonly storage = inject(StorageService);

	private readonly primaryUrl = environment.apiBaseUrl;
	private readonly fallbackUrl = environment.apiFallbackUrl;
	// Once the primary host proves unreachable we stick to the fallback for the
	// rest of the session, so we don't pay the connection timeout on every call.
	private useFallback = false;

	private get baseUrl(): string {
		return this.useFallback && this.fallbackUrl ? this.fallbackUrl : this.primaryUrl;
	}

	/**
	 * Execute an API call as described by its endpoint definition (shared/dto/endpoints.ts):
	 * the HTTP method, the route — with `{param}` segments filled from `options.params` — and
	 * the request/response types all come from the shared contract. The session ticket, when
	 * one is stored, rides in the `Authorization: Bearer` header of every request.
	 */
	public call<E extends AnyEndpoint>(endpoint: E, ...args: CallArgs<E>): Promise<EndpointResponse<E>> {
		const options = (args[0] ?? {}) as { params?: Record<string, string>; body?: unknown; query?: Record<string, string> };
		const url = this.buildUrl(endpoint.path, options.params, options.query);
		const body = METHODS_WITH_BODY.includes(endpoint.method) ? options.body ?? null : null;
		return this.send(base => this.http.request<EndpointResponse<E>>(endpoint.method, base + url, {
			body,
			headers: this.authHeaders(),
		}));
	}

	private buildUrl(path: string, params?: Record<string, string>, query?: Record<string, string>): string {
		const resolved = path.replace(/\{(\w+)\}/g, (_, name: string) => encodeURIComponent(params?.[name] ?? ''));
		const search = new URLSearchParams(query).toString();
		return `/${resolved}${search ? `?${search}` : ''}`;
	}

	private authHeaders(): Record<string, string> {
		const ticket = this.storage.getString('sessionTicket');
		return ticket ? { Authorization: `Bearer ${ticket}` } : {};
	}

	private async send<T>(request: (base: string) => Observable<T>): Promise<T> {
		try {
			return await firstValueFrom(request(this.baseUrl));
		} catch (err) {
			// The primary host is down: retry once against the fallback, then keep
			// using it for the remainder of the session.
			if (!this.useFallback && this.fallbackUrl && this.isUnreachable(err)) {
				console.warn(`Primary API host ${this.primaryUrl} is unreachable, falling back to ${this.fallbackUrl}`);
				this.useFallback = true;
				try {
					return await firstValueFrom(request(this.fallbackUrl));
				} catch (fallbackErr) {
					throw this.fail(fallbackErr);
				}
			}
			throw this.fail(err);
		}
	}

	// A server that answered — even with a 4xx/5xx — is responding, so those are
	// genuine errors. Only a connection failure (status 0) or a gateway error
	// means the host itself is unreachable and the fallback is worth a try.
	private isUnreachable(err: unknown): boolean {
		return err instanceof HttpErrorResponse && [0, 502, 503, 504].includes(err.status);
	}

	private fail(err: unknown): Error {
		const message: string = err instanceof HttpErrorResponse
			? (err.error?.error ?? err.message)
			: (err as Error)?.message ?? String(err);
		this.toast.error(message);
		return new Error(message);
	}
}
