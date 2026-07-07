import { Component, input } from '@angular/core';

/**
 * Reusable chip-total display shared by chip-based games (e.g. poker).
 * Renders the amount with a chip glyph and consistent styling.
 */
@Component({
	selector: 'gg-chip-count',
	standalone: true,
	template: `{{ amount() }}<span class="chip-glyph">●</span>`,
	styleUrl: './chip-count.component.scss',
	host: { class: 'chip-count' },
})
export class ChipCountComponent {
	public readonly amount = input.required<number>();
}
