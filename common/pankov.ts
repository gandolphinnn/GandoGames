import { RoomPlayer, RoomState } from './api';
import { Game, GameState } from './game';

export interface PankovPlayer extends RoomPlayer {
	lives: number;
}

export interface RevealResult {
	wasLying: boolean;
	loserIndex: number;
	declared: number;
	actual: number;
}

export interface PankovGameState {
	gamePhase: 'turn-start' | 'result' | 'game-over';
	currentPlayerIndex: number;
	previousDeclaration: number | null;
	previousPlayerIndex: number | null;
	revealResult: RevealResult | null;
	winnerName: string | null;
	players: PankovPlayer[];
}

export type PankovRoomState = Omit<RoomState, 'gameState'> & {
	gameState: PankovGameState | null;
};

export interface PankovActionRequest {
	sessionTicket: string;
	type: 'declare' | 'call-false' | 'next-turn';
	declaration?: number;
	actualRoll?: number;
}

export interface PankovState extends GameState {

}

export class PankovGame extends Game<PankovState> {
	public minPlayers: number = 2;
	public maxPlayers: number = 6;
}