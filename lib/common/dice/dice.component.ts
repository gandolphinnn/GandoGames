import { Component, effect, input, signal, untracked } from '@angular/core';

@Component({
	selector: 'gg-dice',
	standalone: true,
	templateUrl: './dice.component.html',
	styleUrl: './dice.component.sass',
})
export class DiceComponent {
	readonly value = input<number>(1);

	/** Toggles between 1 and 2 on each value change to re-trigger the CSS animation. */
	protected readonly rollParity = signal<0 | 1 | 2>(0);

	constructor() {
		effect(() => {
			this.value(); // subscribe to value changes
			untracked(() => {
				this.rollParity.update((p) => (p === 1 ? 2 : 1));
			});
		});
	}
}
