import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthResponse, BaseRequest, GuestLoginRequest, LoginRequest, ProfileData, ProfileUpdateRequest, RegisterRequest, Theme } from '@gandogames/shared/dto';
import { BackendService } from './backend.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

export interface AuthUser extends AuthResponse {
	isGuest: boolean;
}

const PROFILE_UPDATE_DEBOUNCE = 1000;
@Injectable({ providedIn: 'root' })
export class UserService {
	private readonly backend = inject(BackendService);
	private readonly storage = inject(StorageService);
	private readonly toast = inject(ToastService);

	private readonly _user = signal<AuthUser | null>(null);
	public readonly user = this._user.asReadonly();
	public readonly isLoggedIn = computed(() => this._user() !== null);
	
	public readonly theme = computed(() => this.user()?.player.theme || 'dark');
	public readonly isDarkTheme = computed(() => this.theme() !== 'light');

	private updateTimer: ReturnType<typeof setTimeout> | null = null;
	private pendingUpdate: Partial<ProfileData> | null = null;
	private preUpdateSnapshot: AuthUser | null = null;

	//#region Init
	constructor() {
		effect(() => this.applyThemeToDom(this.theme()));
	}

	public async init(): Promise<void> {
		try {
			const ticket = this.storage.getString('sessionTicket');
			if (!ticket) return; //! If there is not the sesssion ticket, don't log automatically as guest.

			const request: BaseRequest = { sessionTicket: ticket };
			const result = await this.backend.post<AuthResponse>('/auth/check', request);
			this.setSession(result);
		} catch {
			this.storage.remove('sessionTicket');
			const guestId = this.storage.getString('guestId');
			if (!guestId) return;
			try {
				const request: GuestLoginRequest = { customId: guestId };
				const result = await this.backend.post<AuthResponse>('/auth/guestLogin', request);
				this.setSession(result);
			} catch {
				this.storage.remove('guestId');
			}
		}
	}
	//#endregion Init

	//#region Auth
	public async login(email: string, password: string): Promise<void> {
		const request: LoginRequest = { email, password };
		const result = await this.backend.post<AuthResponse>('/auth/login', request);
		this.setSession(result);
	}

	public async register(email: string, password: string, username: string): Promise<void> {
		const request: RegisterRequest = { email, password, username };
		const result = await this.backend.post<AuthResponse>('/auth/register', request);
		this.setSession(result);
	}

	public async loginAsGuest(): Promise<void> {
		let customId = this.storage.getString('guestId');
		if (!customId) {
			customId = typeof crypto.randomUUID === 'function'
				? crypto.randomUUID()
				: Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('-');
			this.storage.setString('guestId', customId);
		}
		const request: GuestLoginRequest = { customId };
		const result = await this.backend.post<AuthResponse>('/auth/guestLogin', request);
		this.setSession(result);
	}

	public logout(): void {
		this._user.set(null);
		this.storage.remove('sessionTicket');
	}
	//#endregion Auth

	public updateProfileData(data: Partial<ProfileData>): void {
		const user = this._user();
		if (!user) return;
		if (!this.pendingUpdate) this.preUpdateSnapshot = user;
		this.pendingUpdate = { ...this.pendingUpdate, ...data };
		this._user.set({ ...user, player: { ...user.player, ...data } });
		if (this.updateTimer !== null) clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(() => void this.flushProfileUpdate(), PROFILE_UPDATE_DEBOUNCE);
	}

	private async flushProfileUpdate(): Promise<void> {
		this.updateTimer = null;
		const snapshot = { ... this.preUpdateSnapshot!};
		const data = { ... this.pendingUpdate!};
		this.pendingUpdate = null;
		this.preUpdateSnapshot = null;
		try {
			const request: ProfileUpdateRequest = { sessionTicket: snapshot.sessionTicket, ...data };
			const result = await this.backend.post<ProfileData>('/profile/update', request);
			const current = this._user();
			if (current) this._user.set({ ...current, player: { ...current.player, ...result } });
		} catch (err) {
			this._user.set(snapshot);
			this.toast.warning('Failed to update profile');
			console.error('Profile update error:', err);
		}
	}

	public async deleteAccount(): Promise<void> {
		const user = this._user();
		if (!user) return;
		const request: BaseRequest = { sessionTicket: user.sessionTicket };
		await this.backend.post<void>('/profile/delete', request);
		this.logout();
	}

	private setSession(response: AuthResponse): void {
		// player.isGuest is the server's authoritative guest flag; derive AuthUser.isGuest from it
		// so the two never diverge (e.g. a guest restored via /auth/check stays a guest).
		const user: AuthUser = { ...response, isGuest: response.player.isGuest ?? false };
		this._user.set(user);
		this.storage.setString('sessionTicket', user.sessionTicket);
	}

	private applyThemeToDom(theme: Theme): void {
		if (theme === 'light') {
			document.documentElement.setAttribute('data-theme', 'light');
		} else {
			document.documentElement.removeAttribute('data-theme');
		}
	}
}
