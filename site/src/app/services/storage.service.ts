import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
	public getJson<T>(key: string): T | null {
		const stored = localStorage.getItem(key);
		return stored ? (JSON.parse(stored) as T) : null;
	}

	public setJson(key: string, value: unknown): void {
		localStorage.setItem(key, JSON.stringify(value));
	}

	public getString(key: string): string | null {
		return localStorage.getItem(key);
	}

	public setString(key: string, value: string): void {
		localStorage.setItem(key, value);
	}

	public remove(key: string): void {
		localStorage.removeItem(key);
	}
}
