// The standard 52-card French deck types, shared by every card game (poker, blackjack, …).
// Runtime deck helpers (createDeck/shuffle) live in api/src/games/deck.ts — this package
// exports types and interfaces only.

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
	suit: Suit;
	rank: Rank;
}
