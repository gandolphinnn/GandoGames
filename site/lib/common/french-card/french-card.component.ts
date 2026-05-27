import { Component, computed, input } from '@angular/core';
import type { Card } from '@gandogames/common/poker';

const SUIT_SYMBOL: Record<string, string> = {
	spades: '♠',
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
};

@Component({
	selector: 'gg-french-card',
	standalone: true,
	template: '{{ text() }}',
	styleUrl: './french-card.component.scss',
	host: { '[class]': 'hostClass()' },
})
export class FrenchCardComponent {
	public readonly card = input<Card | null>(null);
	public readonly size = input<'sm' | 'md' | 'lg'>('md');

	protected readonly text = computed(() => {
		const c = this.card();
		return c ? `${c.rank}${SUIT_SYMBOL[c.suit]}` : '';
	});

	protected readonly hostClass = computed(() => {
		const c = this.card();
		const classes = ['card'];
		if (!c) {
			classes.push('card-placeholder');
		} else if (c.suit === 'hearts' || c.suit === 'diamonds') {
			classes.push('card-red');
		}
		if (this.size() === 'sm') classes.push('card-sm');
		if (this.size() === 'lg') classes.push('card-lg');
		return classes.join(' ');
	});
}
