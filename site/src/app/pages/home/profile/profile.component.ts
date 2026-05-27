import { Component, inject, signal, Signal } from '@angular/core';
import { Router } from '@angular/router';

import { IonButton } from '@ionic/angular/standalone';
import { PLAYER_ICONS, PlayerIcon } from '@gandogames/lib/player-icons';
import { PlayerAvatarComponent } from '../../../components/player-avatar/player-avatar.component';
import { AuthService, AuthUser } from '@gandogames/services/auth.service';
import { ThemeService } from '@gandogames/services/theme.service';

@Component({
	selector: 'gg-profile',
	imports: [PlayerAvatarComponent, IonButton],
	templateUrl: './profile.component.html',
	styleUrl: './profile.component.scss',
})
export class ProfileComponent {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly themeService = inject(ThemeService);

	public readonly user: Signal<AuthUser | null> = this.auth.user;
	public readonly confirmingDelete = signal(false);
	public readonly loading = signal(false);
	public readonly error = signal<string | null>(null);
	public readonly savingIcon = signal<string | null>(null);
	public readonly isDark = this.themeService.isDark;

	public readonly icons: PlayerIcon[] = PLAYER_ICONS;

	public toggleTheme(): void {
		this.themeService.toggle();
	}

	public async saveIcon(iconId: string): Promise<void> {
		if (this.savingIcon() !== null) return;
		this.savingIcon.set(iconId);
		this.error.set(null);
		try {
			await this.auth.updateIcon(iconId);
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.savingIcon.set(null);
		}
	}

	public logout(): void {
		this.auth.logout();
		this.router.navigate(['/login']);
	}

	public requestDelete(): void {
		this.confirmingDelete.set(true);
		this.error.set(null);
	}

	public cancelDelete(): void {
		this.confirmingDelete.set(false);
	}

	public async confirmDelete(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.auth.deleteAccount();
			await this.router.navigate(['/login']);
		} catch (err) {
			this.error.set((err as Error).message ?? 'Failed to delete account');
			this.loading.set(false);
			this.confirmingDelete.set(false);
		}
	}
}
