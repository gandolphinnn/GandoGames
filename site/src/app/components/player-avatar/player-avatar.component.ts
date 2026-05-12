import { Component, computed, input } from '@angular/core';
import { GamePlayer } from '@gandogames/common/api';
import { PLAYER_ICONS } from '@gandogames/lib/player-icons';
import { playerNameHue } from './player-name-hue';

@Component({
	selector: 'gg-player-avatar',
	template: `
		@if (player().icon) {
			<i [class]="iconFaClass()"></i>
		} @else {
			{{ player().name.charAt(0).toUpperCase() }}
		}
	`,
	styleUrl: './player-avatar.component.scss',
	host: { '[style.background]': 'bg()' },
})
export class PlayerAvatarComponent {
	public readonly player = input.required<GamePlayer>();

	public readonly bg = computed(() => `hsl(${playerNameHue(this.player().name)}, 60%, 42%)`);

	public readonly iconFaClass = computed(() =>
		PLAYER_ICONS.find((icon) => icon.id === this.player().icon)?.fa ?? ''
	);
}
