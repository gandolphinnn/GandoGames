import { Service } from '@angular/core';

export type StorageKey = 'sessionTicket' | 'guestId';

const KEY_MAP: Record<StorageKey, string> = {
	sessionTicket: 'gg_session_ticket',
	guestId: 'gg_guest_id',
};

@Service()
export class StorageService {
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
