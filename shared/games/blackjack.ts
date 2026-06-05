import { GamePlayer, GameState, RoomData } from "..";
import { Card } from "./cards";

// Blackjack reuses the standard shared French deck.
export type { Card, Rank, Suit } from "./cards";

export type BlackjackPhase = 'betting' | 'insurance' | 'player-turns' | 'result' | 'game-over';

export type HandOutcome = 'win' | 'lose' | 'push' | 'blackjack' | 'surrender';

export interface BlackjackHand {
	cards: Card[],
	bet: number,
	doubled: boolean,
	surrendered: boolean,
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
