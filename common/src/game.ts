import { RoomBaseRequest } from "./room";

export type GameType = 'pankov' | 'poker' | 'chess';

export interface GameState {
	lastUpdate: Date;
}

export interface GameBaseRequest extends RoomBaseRequest {
	game: GameType,
}

export interface GameActionRequest extends GameBaseRequest {
	action: string,
	data: any,
}