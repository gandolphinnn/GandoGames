import { computed, effect, inject, Service, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthResponse, BaseRequest, GamePlayer, GuestLoginRequest, LoginRequest, ProfileData, ProfileUpdateRequest, RegisterRequest, Theme } from '@gandogames/shared/dto';
import { BackendService, StorageService } from '@gandogames/services';

@Service()
export class UserService {
	private readonly backend = inject(BackendService);
	private readonly storage = inject(StorageService);
	private readonly translate = inject(TranslateService);

	private readonly _user = signal<AuthResponse | null>(null);
	public readonly user = this._user.asReadonly();
	public readonly isLoggedIn = computed(() => this._user() !== null);

	/**
	 * Uncommitted profile changes (theme/language/icon), applied app-wide as a live
	 * preview through the theme/language effects. Persisted only by `saveProfile()`;
	 * `discardPreview()` reverts everything to the saved profile.
	 */
	private readonly _preview = signal<Partial<ProfileData> | null>(null);

	public readonly theme = computed(() => this._preview()?.theme ?? this.user()?.player.theme ?? 'dark');
	public readonly isDarkTheme = computed(() => this.theme() !== 'light');
	public readonly language = computed(() => this._preview()?.language ?? this.user()?.player.language ?? 'en');

	/** The player as it looks with the pending preview applied — what the profile UI renders. */
	public readonly previewedPlayer = computed<GamePlayer | null>(() => {
		const user = this.user();
		if (!user) return null;
		const preview = this._preview();
		return preview ? { ...user.player, ...preview } : user.player;
	});

	/** True when the preview differs from the saved profile — enables the Save button. */
	public readonly hasPendingChanges = computed(() => {
		const user = this.user();
		const preview = this._preview();
		if (!user || !preview) return false;
		return (Object.entries(preview) as [keyof ProfileData, ProfileData[keyof ProfileData]][])
			.some(([key, value]) => user.player[key] !== value);
	});

	//#region Init
	constructor() {
		effect(() => this.applyThemeToDom(this.theme()));
		effect(() => this.translate.use(this.language()));
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
		this._preview.set(null);
		this.storage.remove('sessionTicket');
	}
	//#endregion Auth

	//#region Profile preview
	/** Stage profile changes as a live preview; nothing is sent to the API until `saveProfile()`. */
	public previewProfileData(data: Partial<ProfileData>): void {
		if (!this._user()) return;
		this._preview.update(preview => ({ ...preview, ...data }));
	}

	/** Drop the pending preview, reverting theme/language/icon to the saved profile. */
	public discardPreview(): void {
		this._preview.set(null);
	}

	/** Persist the pending preview in a single API call. On failure the preview is kept, so it can be retried. */
	public async saveProfile(): Promise<void> {
		const user = this._user();
		const preview = this._preview();
		if (!user || !preview) return;
		const request: ProfileUpdateRequest = { sessionTicket: user.sessionTicket, ...preview };
		const result = await this.backend.post<ProfileData>('/profile/update', request);
		const current = this._user();
		if (current) this._user.set({ ...current, player: { ...current.player, ...result } });
		this._preview.set(null);
	}
	//#endregion Profile preview

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
		this._user.set(response);
		this.storage.setString('sessionTicket', response.sessionTicket);
	}

	private applyThemeToDom(theme: Theme): void {
		if (theme === 'light') {
			document.documentElement.setAttribute('data-theme', 'light');
		} else {
			document.documentElement.removeAttribute('data-theme');
		}
	}
}
