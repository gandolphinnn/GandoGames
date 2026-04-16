import { BaseRequest } from "./auth";
import { GamePlayer, GameType } from '../games/game'

/** Base request for logged users in a room */
export interface RoomBaseRequest extends BaseRequest {
	roomId: string;
}

export interface RoomGetResponse {
	phase: 'waiting' | 'playing' | 'ended';
	name: string;
	hostId: string;
	gameId: GameType;
	players: GamePlayer[];
}

export interface CreateRoomRequest extends BaseRequest {
	game: GameType;
	name: string;
}

export interface RoomListRequest extends BaseRequest {
	games: GameType[];
}
