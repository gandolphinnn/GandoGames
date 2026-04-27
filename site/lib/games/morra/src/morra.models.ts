export type { Hand, MorraPlayer, MorraGameState, MorraRoomState, MorraRoundResult, MorraActionRequest } from '@gandogames/common/morra';

export const HANDS = ['rock', 'paper', 'scissors'] as const;
export type Hand = (typeof HANDS)[number];

export const BEATS: Record<Hand, Hand> = {
	rock: 'scissors',
	scissors: 'paper',
	paper: 'rock',
};

export const HAND_LABEL: Record<Hand, string> = {
	rock: 'Rock',
	paper: 'Paper',
	scissors: 'Scissors',
};

export const INITIAL_LIVES = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
