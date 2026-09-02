import { Component, computed, inject, input, signal } from '@angular/core';
import { IonPopover, IonButton } from '@ionic/angular/standalone';
import { AvatarPlayer, PLAYER_ICONS } from '@gandogames/shared/dto';
import { UserService } from '@gandogames/services';
import { hueFromString } from './hue-from-string';

const SETTINGS_ICON_CLASS = 'fas fa-user-gear';

@Component({
	selector: 'gg-player-avatar',
	imports: [IonPopover, IonButton],
	template: `
		<i
			[class]="isHovered()? settingsIconFaClass : iconFaClass()"
			[class.isHovered]="isHovered()"
			(click)="openPopover($event)"
		></i>

		<!-- TODO: Move "Kick", "AddFriend" and other features here -->
		<!-- <ion-popover
			[isOpen]="popoverOpen()"
			[event]="popoverEvent()"
			(didDismiss)="popoverOpen.set(false)"
		>
			<ng-template>
				<ion-button expand="block">
					Profilo
				</ion-button>

				<ion-button expand="block">
					Impostazioni
				</ion-button>

				<ion-button expand="block">
					Esci
				</ion-button>
			</ng-template>
		</ion-popover> -->
	`,
	styleUrl: './player-avatar.component.scss',
	host: {
		'[class.avatar-theme-light]': 'isLightTheme()',
		'[style.background]': 'bg()',
		'(mouseenter)': 'this.isMe() || isHovered.set(true)',
		'(mouseleave)': 'isHovered.set(false)',
	},
})
export class PlayerAvatarComponent {
	public readonly settingsIconFaClass = SETTINGS_ICON_CLASS;

	private readonly userService = inject(UserService);
	public readonly isLightTheme = computed(() => !this.userService.isDarkTheme());

	public readonly player = input.required<AvatarPlayer>();
	public readonly isMe = computed(() => this.userService.user()?.player.id === this.player().id);


	public readonly iconFaClass = computed(() =>
		PLAYER_ICONS.find(p => p.id === (this.player().icon ?? 'profile'))?.class ?? ''
	);

	public readonly bg = computed(() => `hsl(${hueFromString(this.player().id)}, 38%, 62%)`);

	public readonly isHovered = signal(false);

	public readonly popoverOpen = signal(false);
	public readonly popoverEvent = signal<Event | undefined>(undefined);
	public openPopover(event: Event): void {
		if (this.isMe()) return;
		this.popoverEvent.set(event);
		this.popoverOpen.set(true);
	}
}
