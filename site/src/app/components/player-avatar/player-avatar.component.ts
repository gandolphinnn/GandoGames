import { Component, computed, input } from '@angular/core';
import { GamePlayer } from '@gandogames/common/api';
import { PLAYER_ICONS } from '@gandogames/lib/player-icons';

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

	public readonly bg = computed(() => {
		const name = this.player().name;
		let hash = 0;
		for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
		return `hsl(${hash % 360}, 60%, 42%)`;
	});

	public readonly iconFaClass = computed(() =>
		PLAYER_ICONS.find((icon) => icon.id === this.player().icon)?.fa ?? ''
	);
}
