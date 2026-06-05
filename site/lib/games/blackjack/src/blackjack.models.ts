export type {
	BlackjackPlayer, BlackjackHand, BlackjackDealer,
	BlackjackGameState, BlackjackRoomState, BlackjackPhase, HandOutcome,
} from '@gandogames/shared/blackjack';
export type { Card, Rank, Suit } from '@gandogames/shared/cards';

import type { Card, Rank } from '@gandogames/shared/cards';

export const MIN_BET = 10;
export const STARTING_CHIPS = 1000;
export const MAX_HANDS = 4;

/** Quick-bet chip denominations offered during the betting phase. */
export const BET_STEPS = [10, 25, 50, 100, 250];

export function cardValue(rank: Rank): number {
	if (rank === 'A') return 11;
	if (rank === 'J' || rank === 'Q' || rank === 'K' || rank === '10') return 10;
	return parseInt(rank, 10);
}

export function handValue(cards: Card[]): { total: number; soft: boolean } {
	let total = 0;
	let aces = 0;
	for (const c of cards) {
		total += cardValue(c.rank);
		if (c.rank === 'A') aces++;
	}
	while (total > 21 && aces > 0) { total -= 10; aces--; }
	return { total, soft: aces > 0 };
}

export function handLabel(cards: Card[]): string {
	if (cards.length === 0) return '–';
	const { total, soft } = handValue(cards);
	if (total > 21) return `${total} • Bust`;
	return soft ? `Soft ${total}` : `${total}`;
}

export function outcomeLabel(outcome: string): string {
	switch (outcome) {
		case 'blackjack': return 'Blackjack!';
		case 'win': return 'Win';
		case 'push': return 'Push';
		case 'surrender': return 'Surrender';
		case 'lose': return 'Lose';
		default: return outcome;
	}
}
