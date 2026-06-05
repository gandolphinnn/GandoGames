import { Component, computed, inject, input } from '@angular/core';
import { AvatarPlayer, PLAYER_ICONS } from '@gandogames/shared/api';
import { UserService } from '@gandogames/services/user.service';

@Component({
	selector: 'gg-player-avatar',
	template: `<i [class]="iconFaClass()"></i>`,
	styleUrl: './player-avatar.component.scss',
	host: {
		'[class.avatar-theme-light]': 'isLightTheme()',
		'[style.background]': 'bg()',
	},
})
export class PlayerAvatarComponent {
	private readonly userService = inject(UserService);
	public readonly isLightTheme = computed(() => !this.userService.isDarkTheme());
	
	public readonly player = input.required<AvatarPlayer>();

	public readonly iconFaClass = computed(() =>
		PLAYER_ICONS.find(p => p.id === (this.player().icon ?? 'profile'))?.class ?? ''
	);

	public readonly bg = computed(() => {
		const id = this.player().id;
		let hash = 0;
		for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
		return `hsl(${hash % 360}, 38%, 62%)`;
	});
}
