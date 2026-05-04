import { Component, Input } from '@angular/core';

export interface PlayerChipData {
	id: string;
	name: string;
	lives: number;
	highlight?: boolean;
	statusText?: string;
}

@Component({
	selector: 'gg-player-chip',
	standalone: true,
	templateUrl: './player-chip.component.html',
	styleUrl: './player-chip.component.scss',
	host: {
		'[class.player-chip-me]': 'isMe',
		'[class.player-chip-eliminated]': 'data?.lives === 0',
		'[class.player-chip-highlight]': 'data?.highlight ?? false',
	},
})
export class PlayerChipComponent {
	@Input({ required: true }) public data!: PlayerChipData;
	@Input({ required: true }) public livesRange!: number[];
	@Input() public isMe = false;
}
