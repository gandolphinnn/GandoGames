import { GamePlayer, GameState, RoomData } from "..";
import { Card, Rank } from "./cards";

// Blackjack reuses the standard shared French deck.
export type { Card, Rank, Suit } from "./cards";

export const MIN_BET = 10;
export const STARTING_CHIPS = 1000;
export const MAX_HANDS = 4;
/** Quick-bet chip denominations offered during the betting phase. */
export const BET_STEPS = [10, 25, 50, 100, 250];

export type BlackjackPhase = 'betting' | 'insurance' | 'player-turns' | 'result' | 'game-over';

export type HandOutcome = 'win' | 'lose' | 'push' | 'blackjack';

export interface BlackjackHand {
	cards: Card[],
	bet: number,
	doubled: boolean,
	stood: boolean,
	busted: boolean,
	/** Natural 21 on the first two cards of a non-split hand. */
	isBlackjack: boolean,
	/** Hand produced by splitting a pair of aces (one card only, auto-stood). */
	fromSplitAces: boolean,
	/** Set once the round is resolved. */
	outcome?: HandOutcome,
	/** Net chip change for this hand once resolved (negative = loss). */
	net?: number,
}

export interface BlackjackPlayer extends GamePlayer {
	chips: number,
	hands: BlackjackHand[],
	/** Index into `hands` currently being played. */
	activeHandIndex: number,
	hasBet: boolean,
	insuranceBet: number,
	insuranceResolved: boolean,
	/** Net chip change from the insurance side bet once resolved. */
	insuranceNet?: number,
	/** True once the player has finished acting on every hand this round. */
	done: boolean,
}

export interface BlackjackDealer {
	cards: Card[],
	/** Until true, the hole card (index 1+) is stripped from the public state. */
	holeRevealed: boolean,
}

export interface BlackjackGameState extends GameState {
	gamePhase: BlackjackPhase,
	players: BlackjackPlayer[],
	dealer: BlackjackDealer,
	/** Hidden: the shoe. Always [] in public state. */
	deck: Card[],
	dealerHadBlackjack: boolean,
	/** Single-player table: the game only ends when the lone player busts out. */
	soloMode: boolean,
	winnerName?: string,
}

export interface BlackjackRoomState extends RoomData {
	gameState?: BlackjackGameState,
}

/** Blackjack value of a single rank (Ace counts as 11; soft-ace handling is in handValue). */
export function cardValue(rank: Rank): number {
	if (rank === 'A') return 11;
	if (rank === 'J' || rank === 'Q' || rank === 'K' || rank === '10') return 10;
	return parseInt(rank, 10);
}

/** Best total for a hand and whether it is soft (an ace still counted as 11). */
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

/** Display label for a hand's total (e.g. "Soft 17", "20", "23 • Bust"). */
export function handLabel(cards: Card[]): string {
	if (cards.length === 0) return '–';
	const { total, soft } = handValue(cards);
	if (total > 21) return `${total} • Bust`;
	return soft ? `Soft ${total}` : `${total}`;
}

/** Display label for a resolved hand outcome. */
export function outcomeLabel(outcome: HandOutcome): string {
	switch (outcome) {
		case 'blackjack': return 'Blackjack!';
		case 'win': return 'Win';
		case 'push': return 'Push';
		case 'lose': return 'Lose';
	}
}
