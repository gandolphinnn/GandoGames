import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthResponse, LangCode, ProfileData, ProfileUpdateRequest, Theme } from '@gandogames/common/api';
import { BackendService } from './backend.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

export interface AuthUser extends AuthResponse {
	isGuest: boolean;
}

const SESSION_KEY = 'gg_auth';
const GUEST_ID_KEY = 'gg_guest_id';
const THEME_KEY = 'gg_theme';

@Injectable({ providedIn: 'root' })
export class UserService {
	private readonly backend = inject(BackendService);
	private readonly storage = inject(StorageService);
	private readonly toast = inject(ToastService);

	private readonly _user = signal<AuthUser | null>(this.storage.getJson<AuthUser>(SESSION_KEY));
	public readonly user = this._user.asReadonly();
	public readonly isLoggedIn = computed(() => this._user() !== null);

	// Theme derived from the user's session, falling back to localStorage for pre-login
	public readonly theme = computed<Theme>(() =>
		this._user()?.player.theme ?? (this.storage.getString(THEME_KEY) === 'light' ? 'light' : 'dark')
	);
	public readonly isDarkTheme = computed(() => this.theme() !== 'light');

	private lastToggle = 0;
	private loadedTicket: string | null = null;

	constructor() {
		// Apply theme immediately before effects run to avoid flash
		this.applyThemeToDom(this.theme());

		effect(() => {
			this.applyThemeToDom(this.theme());
			this.storage.setString(THEME_KEY, this.theme());
		});

		effect(() => {
			const user = this._user();
			if (user && !user.isGuest && user.sessionTicket !== this.loadedTicket) {
				this.loadedTicket = user.sessionTicket;
				void this.loadProfileFromBackend(user.sessionTicket);
			}
		});
	}

	//#region Auth
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
		this.storage.remove(SESSION_KEY);
	}
	//#endregion Auth

	public toggleTheme(): void {
		const now = Date.now();
		if (now - this.lastToggle < 500) return;
		this.lastToggle = now;
		void this.updateProfileData({ theme: this.isDarkTheme() ? 'light' : 'dark' });
	}

	public async updateProfileData(data: Partial<ProfileData>): Promise<void> {
		const user = this._user();
		if (!user) return;
		this.setSession({ ...user, player: { ...user.player, ...data } });
		try {
			const request = { sessionTicket: user.sessionTicket, ...data } as ProfileUpdateRequest;
			const result = await this.backend.post<ProfileData>('/profile/update', request);
			this.setSession({ ...user, player: { ...user.player, ...result } });
		} catch (err) {
			this.setSession(user);
			this.toast.warning('Failed to update profile');
			console.error('Profile update error:', err);
		}
	}

	public async deleteAccount(): Promise<void> {
		const user = this._user();
		if (!user) return;
		await this.backend.post('/profile/delete', { sessionTicket: user.sessionTicket });
		this.logout();
	}

	private setSession(user: AuthUser): void {
		this._user.set(user);
		this.storage.setJson(SESSION_KEY, user);
	}

	private getOrCreateGuestId(): string {
		let id = this.storage.getString(GUEST_ID_KEY);
		if (!id) {
			id = crypto.randomUUID();
			this.storage.setString(GUEST_ID_KEY, id);
		}
		return id;
	}

	private applyThemeToDom(theme: Theme): void {
		if (theme === 'light') {
			document.documentElement.setAttribute('data-theme', 'light');
		} else {
			document.documentElement.removeAttribute('data-theme');
		}
	}

	private async loadProfileFromBackend(sessionTicket: string): Promise<void> {
		try {
			const profile = await this.backend.post<ProfileData>('/profile/get', { sessionTicket });
			const user = this._user();
			if (user) this.setSession({ ...user, player: { ...user.player, ...profile } });
		} catch {
			// keep current values on failure
		}
	}
}
