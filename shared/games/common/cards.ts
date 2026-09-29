// The standard 52-card French deck, shared by every card game (e.g. poker).
// Environment-agnostic: no Node/Angular/browser APIs, so both the API and the site
// can compile and run it.

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
	suit: Suit;
	rank: Rank;
}

export type CardKey = `${Rank}-${Suit}`

/** Stable string identity for a card — for keying, dedup, or change tracking. */
export function cardKey(card: Card): CardKey {
	return `${card.rank}-${card.suit}`;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class Deck {
	private cards = new Set<CardKey>;
	
	public constructor(ranks: readonly Rank[] = RANKS) {
		for (const suit of SUITS) 
			for (const rank of ranks) 
				this.cards.add(cardKey({ suit, rank }));
	}

	public shuffle() {
		const cards = [...this.cards]
		for (let i = cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[cards[i], cards[j]] = [cards[j]!, cards[i]!];
		}
		this.cards = new Set(cards);
	}

	public remove(cards: CardKey[]) {
		for (const card of cards)
			this.cards.delete(card);
	}
}