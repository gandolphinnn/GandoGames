import { GamePlayer, GameState, RoomData } from "..";

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
	suit: Suit;
	rank: Rank;
}

export interface PokerPlayer extends GamePlayer {
	chips: number;
	cards: Card[];
	streetBet: number;
	folded: boolean;
	hasActed: boolean;
	isAllIn: boolean;
}

export interface PokerHandResult {
	winners: string[];
	hands: Record<string, string>;
	potAmount: number;
}

export interface PokerGameState extends GameState {
	gamePhase: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown' | 'game-over';
	players: PokerPlayer[];
	communityCards: Card[];
	deck: Card[];
	pot: number;
	currentBet: number;
	currentPlayerIndex: number;
	dealerIndex: number;
	result?: PokerHandResult;
	winnerName?: string;
}

export interface PokerRoomState extends RoomData {
	gameState?: PokerGameState;
}

export interface PokerActionRequest {
	action: 'fold' | 'check' | 'call' | 'raise' | 'next-hand';
	amount?: number;
}
