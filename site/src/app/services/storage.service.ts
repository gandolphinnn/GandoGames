import { Injectable } from '@angular/core';

export type StorageKey = 'sessionTicket' | 'guestId';

const KEY_MAP: Record<StorageKey, string> = {
	sessionTicket: 'gg_session_ticket',
	guestId: 'gg_guest_id',
};

@Injectable({ providedIn: 'root' })
export class StorageService {
	public getJson<T>(key: StorageKey): T | null {
		const stored = localStorage.getItem(KEY_MAP[key]);
		return stored ? (JSON.parse(stored) as T) : null;
	}

	public setJson(key: StorageKey, value: unknown): void {
		localStorage.setItem(KEY_MAP[key], JSON.stringify(value));
	}

	public getString(key: StorageKey): string | null {
		return localStorage.getItem(KEY_MAP[key]);
	}

	public setString(key: StorageKey, value: string): void {
		localStorage.setItem(KEY_MAP[key], value);
	}

	public remove(key: StorageKey): void {
		localStorage.removeItem(KEY_MAP[key]);
	}
}
