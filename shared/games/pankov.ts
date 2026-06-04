import { GamePlayer, GameState, RoomData } from "..";

export type RollValue =
	| 31 | 32 | 41 | 42 | 43 | 51 | 52 | 53 | 54 | 61 | 62 | 63 | 64 | 65
	| 11 | 22 | 33 | 44 | 55 | 66
	| 21;

export interface PankovPlayer extends GamePlayer {
	lives: number,
}

export interface RevealResult {
	declared: RollValue,
	actual: RollValue,
	wasLying: boolean,
	loserIndex: number,
}

export interface PankovGameState extends GameState {
	gamePhase: 'turn-start' | 'rolled' | 'result' | 'game-over',
	players: PankovPlayer[],
	currentPlayerIndex: number,
	previousPlayerIndex: number | null,
	previousDeclaration: RollValue | null,
	/** Hidden: actual roll of the previous declarer. Always null in public state. */
	previousActualRoll: RollValue | null,
	/** Hidden: current player's roll. Null for all other players. */
	currentRoll: RollValue | null,
	winnerName?: string,
	revealResult?: RevealResult,
}

export interface PankovRoomState extends RoomData {
	gameState?: PankovGameState,
}

