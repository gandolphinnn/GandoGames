import type { Card, Rank, Suit } from '@gandogames/shared/cards';

// Runtime French-deck helpers shared by the card games (poker, blackjack, …).
// Lives in api/ because only the server deals cards — the shared package is types-only.

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** A fresh, ordered 52-card deck. */
export function createDeck(): Card[] {
	const deck: Card[] = [];
	for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
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
