import { RoomBaseRequest } from "./room";

export type GameType = 'morra' /* | 'pankov' */;

export interface GamePlayer {
	id: string,
}

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