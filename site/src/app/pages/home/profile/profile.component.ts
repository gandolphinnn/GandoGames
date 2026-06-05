import { Component, inject, signal, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { contrastOutline, languageOutline, logOutOutline, moonOutline, sunnyOutline, trashOutline } from 'ionicons/icons';
import { IonCard, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, } from '@ionic/angular/standalone';
import { ION_IMPORTS } from '@gandogames/lib/ion-imports';

import { GamePlayer, IconType, LangCode } from '@gandogames/shared/api';
import { LANGUAGES, PLAYER_ICONS, PlayerIcon } from '@gandogames/lib/player-icons';
import { PlayerAvatarComponent } from '../../../components/player-avatar/player-avatar.component';
import { AuthUser, UserService } from '@gandogames/services/user.service';
import { ToastService } from '@gandogames/services/toast.service';

@Component({
	selector: 'gg-profile',
	host: { class: 'ion-page' },
	imports: [
    PlayerAvatarComponent,
    ...ION_IMPORTS,
    IonCard,
    IonSegment, IonSegmentButton, IonSelect, IonSelectOption
],
	templateUrl: './profile.component.html',
	styleUrl: './profile.component.scss',
})
export class ProfileComponent {
	private readonly userService = inject(UserService);
	private readonly router = inject(Router);
	private readonly toast = inject(ToastService);

	public readonly user: Signal<AuthUser | null> = this.userService.user;
	public readonly deleting = signal(false);
	public readonly isDark = this.userService.isDarkTheme;

	public readonly icons: PlayerIcon[] = PLAYER_ICONS.filter(i => !i.reserved);
	public readonly languages = LANGUAGES;

	constructor() {
		addIcons({ contrastOutline, sunnyOutline, moonOutline, languageOutline, logOutOutline, trashOutline });
	}

	public withIcon(player: GamePlayer, icon: IconType): GamePlayer {
		return { ...player, icon };
	}

	public setTheme(theme: string | number): void {
		this.userService.updateProfileData({ theme: theme as 'light' | 'dark' });
	}

	public setIcon(iconId: IconType): void {
		this.userService.updateProfileData({ icon: iconId });
	}

	public setLanguage(lang: LangCode): void {
		this.userService.updateProfileData({ language: lang });
	}

	public async logout(): Promise<void> {
		const confirmed = await this.toast.yesNo('Are you sure you want to log out?');
		if (!confirmed) return;
		this.userService.logout();
		void this.router.navigate(['/login']);
	}

	public async deleteAccount(): Promise<void> {
		const confirmed = await this.toast.yesNo('This will permanently delete your account. This cannot be undone.');
		if (!confirmed) return;
		this.deleting.set(true);
		try {
			await this.userService.deleteAccount();
			await this.router.navigate(['/login']);
		} finally {
			this.deleting.set(false);
		}
	}
}
