import { RoomPlayer, RoomState } from './api';
import { Game, GameState } from './game'

// ── Hand ──────────────────────────────────────────────────────────────────────

export type Hand = 'rock' | 'paper' | 'scissors';

export const HANDS: Hand[] = ['rock', 'paper', 'scissors'];

/** Maps each hand to the hand it beats. */
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

// ── Player ────────────────────────────────────────────────────────────────────

export interface MorraPlayer extends RoomPlayer {
	lives: number;
	hasPicked: boolean;
}

// ── Game state ────────────────────────────────────────────────────────────────

export interface MorraRoundResult {
	picks: Record<string, Hand>; // playFabId → revealed hand
	losers: string[];            // playFabIds who lost a life this round
	isDraw: boolean;
}

export interface MorraGameState {
	gamePhase: 'picking' | 'reveal' | 'game-over';
	players: MorraPlayer[];
	result: MorraRoundResult | null;
	winnerName: string | null;
}

export type MorraRoomState = Omit<RoomState, 'gameState'> & {
	gameState: MorraGameState | null;
};

// ── Action request ────────────────────────────────────────────────────────────

export interface MorraActionRequest {
	sessionTicket: string;
	type: 'pick' | 'next-round';
	hand?: Hand;
}

export interface MorraState extends GameState {

}

export class MorraGame extends Game<MorraState> {
	public minPlayers: number = 2;
	public maxPlayers: number = 2;
}