import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Theme, UserSettings } from '@gandogames/common/api';
import { AuthService } from './auth.service';
import { BackendService } from './backend.service';

const STORAGE_KEY = 'gg_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
	private readonly auth = inject(AuthService);
	private readonly backend = inject(BackendService);

	private readonly _theme = signal<Theme>(this.loadFromStorage());
	public readonly theme = this._theme.asReadonly();
	public readonly isDark = computed(() => this._theme() === 'dark');

	constructor() {
		this.apply(this._theme());
		effect(() => {
			const user = this.auth.user();
			if (user && !user.isGuest) {
				this.loadFromPlayFab(user.sessionTicket);
			}
		});
	}

	private lastToggle = 0;

	public toggle(): void {
		const now = Date.now();
		if (now - this.lastToggle < 500) return;
		this.lastToggle = now;
		this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
	}

	public setTheme(theme: Theme): void {
		this.apply(theme);
		localStorage.setItem(STORAGE_KEY, theme);
		const user = this.auth.user();
		if (user && !user.isGuest) {
			this.backend
				.post('/settings/update', { sessionTicket: user.sessionTicket, theme })
				.catch(() => {});
		}
	}

	private apply(theme: Theme): void {
		this._theme.set(theme);
		if (theme === 'light') {
			document.documentElement.setAttribute('data-theme', 'light');
		} else {
			document.documentElement.removeAttribute('data-theme');
		}
	}

	private loadFromStorage(): Theme {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === 'light' ? 'light' : 'dark';
	}

	private async loadFromPlayFab(sessionTicket: string): Promise<void> {
		try {
			const settings = await this.backend.post<UserSettings>('/settings/get', { sessionTicket });
			const theme = settings.theme ?? 'dark';
			this.apply(theme);
			localStorage.setItem(STORAGE_KEY, theme);
		} catch {
			// keep current theme on failure
		}
	}
}
