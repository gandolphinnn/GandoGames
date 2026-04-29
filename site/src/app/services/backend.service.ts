import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
	providedIn: 'root',
})
export class BackendService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = environment.apiBaseUrl;

	public async get<T = any>(url: string) {
		return await firstValueFrom(
			this.http.get<T>(this.baseUrl + url)
			.pipe(
				catchError(this.handleError)
			)
		);
	}

	public async post<T = any>(url: string, body: any) {
		return await firstValueFrom(
			this.http.post<T>(this.baseUrl + url, body)
			.pipe(
				catchError(this.handleError)
			)
		);
	}

	// Fire-and-forget POST guaranteed to reach the server even during page unload.
	public postBeacon(url: string, body: any): void {
		void fetch(this.baseUrl + url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			keepalive: true,
		});
	}

	private handleError(err: HttpErrorResponse) {
		const message: string = err.error?.error ?? err.message;
		return throwError(() => new Error(message));
	}
}
