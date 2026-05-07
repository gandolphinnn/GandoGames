import { Component, input, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { type RoomHistoryEntry } from '@gandogames/common/api';

@Component({
	selector: 'gg-game-history',
	standalone: true,
	imports: [DatePipe, NgTemplateOutlet],
	templateUrl: './game-history.component.html',
	styleUrl: './game-history.component.scss',
})
export class GameHistoryComponent {
	public readonly entries = input.required<RoomHistoryEntry[]>();

	protected readonly open = signal(false);
	protected toggle(): void { this.open.update(v => !v); }
	protected close(): void { this.open.set(false); }
}
