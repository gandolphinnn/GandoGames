import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, firstValueFrom, throwError } from 'rxjs';

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

	private handleError(err: HttpErrorResponse) {
		const message: string = err.error?.error ?? err.message;
		return throwError(() => new Error(message));
	}
}
