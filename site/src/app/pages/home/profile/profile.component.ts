import { Component, inject, signal, Signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { contrastOutline, languageOutline, logOutOutline, moonOutline, sunnyOutline, trashOutline } from 'ionicons/icons';
import { IonCard, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, ViewDidLeave, } from '@ionic/angular/standalone';
import { GamePlayer, IconType, LangCode, LANGUAGES, PLAYER_ICONS, PlayerIcon } from '@gandogames/shared/dto';
import { BASE_IMPORTS } from '@gandogames/lib/ion-imports';
import { UserService, ToastService, UrlService } from '@gandogames/services';
import { PlayerAvatarComponent } from '@gandogames/components';

@Component({
	selector: 'gg-profile',
	host: { class: 'ion-page' },
	imports: [
		...BASE_IMPORTS,
		IonCard, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, PlayerAvatarComponent,
	],
	templateUrl: './profile.component.html',
	styleUrl: './profile.component.scss',
})
export class ProfileComponent implements ViewDidLeave {
	private readonly userService = inject(UserService);
	private readonly urlService = inject(UrlService);
	private readonly toast = inject(ToastService);
	private readonly translate = inject(TranslateService);

	public readonly user = this.userService.user;
	/** The player with the pending preview applied — everything on this page renders from it. */
	public readonly player = this.userService.previewedPlayer;
	public readonly hasPendingChanges = this.userService.hasPendingChanges;
	public readonly saving = signal(false);
	public readonly deleting = signal(false);
	public readonly isDark = this.userService.isDarkTheme;

	public readonly icons: PlayerIcon[] = PLAYER_ICONS.filter(i => !i.reserved);
	public readonly languages = LANGUAGES;

	/** Leaving the page drops any unsaved preview, restoring the saved settings. */
	public ionViewDidLeave(): void {
		this.userService.discardPreview();
	}

	public withIcon(player: GamePlayer, icon: IconType): GamePlayer {
		return { ...player, icon };
	}

	public setTheme(theme: string | number): void {
		this.userService.previewProfileData({ theme: theme as 'light' | 'dark' });
	}

	public setIcon(iconId: IconType): void {
		this.userService.previewProfileData({ icon: iconId });
	}

	public setLanguage(lang: LangCode): void {
		this.userService.previewProfileData({ language: lang });
	}

	public async save(): Promise<void> {
		if (!this.hasPendingChanges() || this.saving()) return;
		this.saving.set(true);
		try {
			await this.userService.saveProfile();
			this.toast.success(this.translate.instant('PROFILE.SAVED') as string);
		} finally {
			this.saving.set(false);
		}
	}

	public async logout(): Promise<void> {
		const confirmed = await this.toast.yesNo(this.translate.instant('PROFILE.LOGOUT_CONFIRM') as string);
		if (!confirmed) return;
		this.userService.logout();
		void this.urlService.get('login').navigate();
	}

	public async deleteAccount(): Promise<void> {
		const confirmed = await this.toast.yesNo(this.translate.instant('PROFILE.DELETE_CONFIRM') as string);
		if (!confirmed) return;
		this.deleting.set(true);
		try {
			await this.userService.deleteAccount();
			await this.urlService.get('login').navigate();
		} finally {
			this.deleting.set(false);
		}
	}
}
