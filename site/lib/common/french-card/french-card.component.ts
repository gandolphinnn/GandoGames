import { Component, computed, input } from '@angular/core';
import type { Card } from '@gandogames/shared/cards';

const SUIT_SYMBOL: Record<string, string> = {
	spades: '♠',
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
};

@Component({
	selector: 'gg-french-card',
	standalone: true,
	templateUrl: './french-card.component.html',
	styleUrl: './french-card.component.scss',
	host: { '[class]': 'hostClass()' },
})
export class FrenchCardComponent {
	public readonly card = input<Card | null>(null);
	public readonly size = input<'sm' | 'md' | 'lg'>('md');

	/** Render the card face down (its back) with `backIcon` instead of the rank/suit. */
	public readonly faceDown = input<boolean>(false);
	/** FontAwesome classes for the icon shown on the card back. */
	public readonly backIcon = input<string>('fa-solid fa-question');

	protected readonly text = computed(() => {
		const c = this.card();
		return c ? `${c.rank}${SUIT_SYMBOL[c.suit]}` : '';
	});

	protected readonly hostClass = computed(() => {
		const classes = ['card'];
		if (this.faceDown()) {
			classes.push('card-back');
		} else {
			const c = this.card();
			if (!c) classes.push('card-placeholder');
			else if (c.suit === 'hearts' || c.suit === 'diamonds') classes.push('card-red');
		}
		if (this.size() === 'sm') classes.push('card-sm');
		if (this.size() === 'lg') classes.push('card-lg');
		return classes.join(' ');
	});
}
