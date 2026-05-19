import { Component, computed, inject, signal, Signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
	IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
	IonList, IonItem, IonLabel, IonNote, IonBadge, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sunnyOutline, moonOutline, logOutOutline, trashOutline, informationCircleOutline, colorPaletteOutline } from 'ionicons/icons';

import { PLAYER_ICONS, PlayerIcon } from '@gandogames/lib/player-icons';
import { PlayerAvatarComponent } from '../../../components/player-avatar/player-avatar.component';
import { AuthService, AuthUser } from '@gandogames/services/auth.service';
import { ThemeService } from '@gandogames/services/theme.service';
import { DeviceService } from '@gandogames/services/device.service';

@Component({
	selector: 'gg-profile',
	host: { '[class.ion-page]': 'device.isMobile()' },
	imports: [
		RouterLink, PlayerAvatarComponent,
		IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
		IonList, IonItem, IonLabel, IonNote, IonBadge,
	],
	templateUrl: './profile.component.html',
	styleUrl: './profile.component.scss',
})
export class ProfileComponent {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly themeService = inject(ThemeService);
	private readonly alertCtrl = inject(AlertController);
	protected readonly device = inject(DeviceService);

	public readonly user: Signal<AuthUser | null> = this.auth.user;
	public readonly confirmingDelete = signal(false);
	public readonly loading = signal(false);
	public readonly error = signal<string | null>(null);
	public readonly savingIcon = signal<string | null>(null);

	public readonly isDark = this.themeService.isDark;
	public readonly themeLabel = computed(() => this.isDark() ? 'Switch to light mode' : 'Switch to dark mode');
	public readonly themeIcon = computed(() => this.isDark() ? 'sunny-outline' : 'moon-outline');
	public readonly isAdmin = computed(() => this.auth.user()?.player.permissions?.includes('admin'));

	public readonly icons: PlayerIcon[] = PLAYER_ICONS;

	constructor() {
		addIcons({ sunnyOutline, moonOutline, logOutOutline, trashOutline, informationCircleOutline, colorPaletteOutline });
	}

	public toggleTheme(): void { this.themeService.toggle(); }

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
		void this.router.navigate(['/login']);
	}

	public async requestDelete(): Promise<void> {
		if (this.device.isMobile()) {
			const alert = await this.alertCtrl.create({
				header: 'Delete account',
				message: 'This will permanently delete your account. This cannot be undone.',
				cssClass: 'gg-alert',
				buttons: [
					{ text: 'Cancel', role: 'cancel' },
					{
						text: 'Delete',
						role: 'confirm',
						cssClass: 'alert-btn-danger',
						handler: () => { void this.confirmDelete(); },
					},
				],
			});
			await alert.present();
		} else {
			this.confirmingDelete.set(true);
			this.error.set(null);
		}
	}

	public cancelDelete(): void { this.confirmingDelete.set(false); }

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
