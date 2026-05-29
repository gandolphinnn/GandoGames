import { Component, inject, signal, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { contrastOutline, languageOutline, logOutOutline, trashOutline } from 'ionicons/icons';
import {
	IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader,
	IonCardSubtitle, IonCardTitle, IonCol, IonContent, IonGrid, IonHeader,
	IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonRow,
	IonSelect, IonSelectOption, IonTitle, IonToggle, IonToolbar,
} from '@ionic/angular/standalone';

import { GamePlayer, IconType, LangCode } from '@gandogames/common/api';
import { LANGUAGES, PLAYER_ICONS, PlayerIcon } from '@gandogames/lib/player-icons';
import { PlayerAvatarComponent } from '../../../components/player-avatar/player-avatar.component';
import { AuthUser, UserService } from '@gandogames/services/user.service';

@Component({
	selector: 'gg-profile',
	host: { class: 'ion-page' },
	imports: [
		PlayerAvatarComponent,
		IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
		IonGrid, IonRow, IonCol,
		IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
		IonBadge, IonList, IonItem, IonLabel, IonIcon, IonToggle,
		IonButton, IonSelect, IonSelectOption,
	],
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

	constructor() {
		addIcons({ contrastOutline, languageOutline, logOutOutline, trashOutline });
	}

	public withIcon(player: GamePlayer, icon: IconType): GamePlayer {
		return { ...player, icon };
	}

	public toggleTheme(): void {
		this.userService.updateProfileData({ theme: this.userService.isDarkTheme() ? 'light' : 'dark' });
	}

	public setIcon(iconId: IconType): void {
		this.userService.updateProfileData({ icon: iconId });
	}

	public setLanguage(lang: LangCode): void {
		this.userService.updateProfileData({ language: lang });
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
		} catch {
			this.loading.set(false);
			this.confirmingDelete.set(false);
		}
	}
}
