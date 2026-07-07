import { Component, input, output } from '@angular/core';
import { BlindLevel } from '@gandogames/shared/dto';

/**
 * Table editor for a poker blinds schedule. Each level has an editable big blind and duration in
 * minutes (the small blind is always half the big blind and isn't shown). The first level can't be
 * removed and the last level is terminal (runs to the end), so its duration reads ∞ and isn't editable.
 * Emits the full level list on every change; the parent normalizes/clamps on save.
 */
@Component({
	selector: 'gg-blind-levels-editor',
	standalone: true,
	templateUrl: './blind-levels-editor.component.html',
	styleUrl: './blind-levels-editor.component.scss',
})
export class BlindLevelsEditorComponent {
	public readonly levels = input.required<BlindLevel[]>();
	public readonly editable = input<boolean>(false);
	/** Big-blind bounds/step, mirrored from the settings field. */
	public readonly min = input<number>(10);
	public readonly max = input<number>(5000);
	public readonly step = input<number>(10);

	public readonly changed = output<BlindLevel[]>();

	protected onBigBlind(index: number, event: Event): void {
		const n = parseInt((event.target as HTMLInputElement).value, 10);
		if (isNaN(n)) return;
		this.changed.emit(this.levels().map((l, i) => i === index ? { ...l, bigBlind: n } : l));
	}

	protected onDuration(index: number, event: Event): void {
		const n = parseInt((event.target as HTMLInputElement).value, 10);
		if (isNaN(n)) return;
		this.changed.emit(this.levels().map((l, i) => i === index ? { ...l, durationMinutes: n } : l));
	}

	protected addLevel(): void {
		const list = this.levels().map(l => ({ ...l }));
		const last = list[list.length - 1];
		// The previously-last level is no longer terminal — give it a real duration if it still reads ∞ (0).
		if (last && last.durationMinutes <= 0) last.durationMinutes = 5;
		// Doubling is the usual next big blind; clamp to the field max.
		const bigBlind = last ? Math.min(this.max(), last.bigBlind * 2) : this.min();
		this.changed.emit([...list, { bigBlind, durationMinutes: 0 }]);
	}

	protected removeLevel(index: number): void {
		if (this.levels().length <= 1) return;
		this.changed.emit(this.levels().filter((_, i) => i !== index));
	}
}
