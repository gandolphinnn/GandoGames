import { GamePlayer, GameState, RoomData } from "..";

export type Hand = 'rock' | 'paper' | 'scissors';

export interface MorraPlayer extends GamePlayer {
	currentPick?: Hand,
	hasPicked: boolean,
	lives: number,
}

export interface MorraRoundResult {
	losers: string[],
	isDraw: boolean,
	picks: Record<string, Hand>,
}

export interface MorraGameState extends GameState {
	gamePhase: 'picking' | 'reveal' | 'game-over',
	players: MorraPlayer[],
	result?: MorraRoundResult,
	winnerName?: string,
}

export interface MorraRoomState extends RoomData {
	gameState?: MorraGameState,
}

export interface MorraActionRequest {
	action: 'pick' | 'next-round',
	hand?: Hand,
}
