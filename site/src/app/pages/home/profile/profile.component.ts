import { Component, inject, signal, Signal } from '@angular/core';
import { Router } from '@angular/router';

import { IonButton, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { GamePlayer, IconType, LangCode } from '@gandogames/common/api';
import { LANGUAGES, PLAYER_ICONS, PlayerIcon } from '@gandogames/lib/player-icons';
import { PlayerAvatarComponent } from '../../../components/player-avatar/player-avatar.component';
import { AuthUser, UserService } from '@gandogames/services/user.service';

@Component({
	selector: 'gg-profile',
	imports: [PlayerAvatarComponent, IonButton, IonSelect, IonSelectOption],
	templateUrl: './profile.component.html',
	styleUrl: './profile.component.scss',
})
export class ProfileComponent {
	private readonly userService = inject(UserService);
	private readonly router = inject(Router);

	public readonly user: Signal<AuthUser | null> = this.userService.user;
	public readonly confirmingDelete = signal(false);
	public readonly loading = signal(false);
	public readonly isDark = this.userService.isDarkTheme;

	public readonly icons: PlayerIcon[] = PLAYER_ICONS;
	public readonly languages = LANGUAGES;

	public withIcon(player: GamePlayer, icon: IconType): GamePlayer {
		return { ...player, icon };
	}

	public toggleTheme(): void {
		this.userService.toggleTheme();
	}

	public setIcon(iconId: IconType): void {
		void this.userService.updateProfileData({ icon: iconId });
	}

	public setLanguage(lang: LangCode): void {
		void this.userService.updateProfileData({ language: lang });
	}

	public logout(): void {
		this.userService.logout();
		void this.router.navigate(['/login']);
	}

	public requestDelete(): void {
		this.confirmingDelete.set(true);
	}

	public cancelDelete(): void {
		this.confirmingDelete.set(false);
	}

	public async confirmDelete(): Promise<void> {
		this.loading.set(true);
		try {
			await this.userService.deleteAccount();
			await this.router.navigate(['/login']);
		} catch (err) {
			this.loading.set(false);
			this.confirmingDelete.set(false);
		}
	}
}
