import { Component, computed, effect, input, output, untracked, viewChild } from '@angular/core';

@Component({
	selector: 'gg-dice',
	standalone: true,
	templateUrl: './dice.component.html',
	styleUrl: './dice.component.scss',
})
export class DiceComponent {
	public value = input.required<number>();

	public loop = computed(() => new Array(this.value()).fill(null));
}
