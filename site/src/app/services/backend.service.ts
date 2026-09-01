import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ToastService } from '@gandogames/services';

@Injectable({
	providedIn: 'root',
})
export class BackendService {
	private readonly http = inject(HttpClient);
	private readonly toast = inject(ToastService);

	private readonly primaryUrl = environment.apiBaseUrl;
	private readonly fallbackUrl = environment.apiFallbackUrl;
	// Once the primary host proves unreachable we stick to the fallback for the
	// rest of the session, so we don't pay the connection timeout on every call.
	private useFallback = false;

	private get baseUrl(): string {
		return this.useFallback && this.fallbackUrl ? this.fallbackUrl : this.primaryUrl;
	}

	public get<T>(url: string): Promise<T> {
		return this.send(base => this.http.get<T>(base + url));
	}

	public post<T>(url: string, body: any): Promise<T> {
		return this.send(base => this.http.post<T>(base + url, body));
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
