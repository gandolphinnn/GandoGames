import { Injectable, computed, inject, signal } from '@angular/core';
import { BackendService } from './backend.service';
import { AuthResponse } from '@gandogames/common/api';

export interface AuthUser extends AuthResponse {
	isGuest: boolean;
}

const STORAGE_KEY = 'gg_auth';
const GUEST_ID_KEY = 'gg_guest_id';

@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly backend = inject(BackendService);

	private readonly _user = signal<AuthUser | null>(this.loadFromStorage());
	public readonly user = this._user.asReadonly();
	public readonly isLoggedIn = computed(() => this._user() !== null);

	public async login(email: string, password: string): Promise<void> {
		const result = await this.backend.post<AuthResponse>('/auth/login', { email, password });
		this.setSession({ ...result, isGuest: false });
	}

	public async register(email: string, password: string, username: string): Promise<void> {
		const result = await this.backend.post<AuthResponse>('/auth/register', { email, password, username });
		this.setSession({ ...result, isGuest: false });
	}

	public async loginAsGuest(): Promise<void> {
		const customId = this.getOrCreateGuestId();
		const result = await this.backend.post<AuthResponse>('/auth/guestLogin', { customId });
		this.setSession({ ...result, isGuest: true });
	}

	public logout(): void {
		this._user.set(null);
		localStorage.removeItem(STORAGE_KEY);
	}

	private setSession(user: AuthUser): void {
		this._user.set(user);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
	}

	private loadFromStorage(): AuthUser | null {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? (JSON.parse(stored) as AuthUser) : null;
	}

	private getOrCreateGuestId(): string {
		let id = localStorage.getItem(GUEST_ID_KEY);
		if (!id) {
			id = crypto.randomUUID();
			localStorage.setItem(GUEST_ID_KEY, id);
		}
		return id;
	}
}
