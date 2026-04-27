import { GamePlayer, GameState, RoomData } from "..";

export interface PankovPlayer extends GamePlayer {
	lives: number,
}

export interface RevealResult {
	declared: number,
	actual: number,
	wasLying: boolean,
	loserIndex: number,
}

export interface PankovGameState extends GameState {
	gamePhase: 'turn-start' | 'result' | 'game-over',
	players: PankovPlayer[],
	currentPlayerIndex: number,
	previousPlayerIndex: number | null,
	previousDeclaration: number | null,
	winnerName?: string,
	revealResult?: RevealResult,
}

export interface PankovRoomState extends RoomData {
	gameState?: PankovGameState,
}
