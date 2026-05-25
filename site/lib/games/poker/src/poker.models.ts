export type { PokerPlayer, PokerGameState, PokerRoomState, PokerHandResult, PokerActionRequest, Card, Suit, Rank } from '@gandogames/common/poker';

export const MIN_RAISE = 100;
export const STARTING_CHIPS = 1000;

export const SUIT_SYMBOL: Record<'spades' | 'hearts' | 'diamonds' | 'clubs', string> = {
	spades: '♠',
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
};
