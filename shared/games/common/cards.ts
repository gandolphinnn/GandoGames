// The standard 52-card French deck, shared by every card game (e.g. poker).
// Environment-agnostic: no Node/Angular/browser APIs, so both the API and the site
// can compile and run it.

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
	suit: Suit;
	rank: Rank;
}

/** Stable string identity for a card — for keying, dedup, or change tracking. */
export function cardKey(card: Card): string {
	return `${card.rank}-${card.suit}`;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** A fresh, ordered deck. Defaults to the full 52 cards; pass `ranks` for a reduced deck. */
export function createDeck(ranks: readonly Rank[] = RANKS): Card[] {
	const deck: Card[] = [];
	for (const suit of SUITS) for (const rank of ranks) deck.push({ suit, rank });
	return deck;
}

/** Fisher–Yates shuffle returning a new array; the input is left untouched. */
export function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}
