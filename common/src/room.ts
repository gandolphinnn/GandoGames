import { BaseRequest, GamePlayer, GameType } from "..";

/** Base request for logged users in a room */
export interface RoomBaseRequest extends BaseRequest {
	roomId: string;
}

export interface RoomData {
	id: string;
	name: string;
	hostId: string;
	game: GameType;
	players: GamePlayer[];
	phase: 'waiting' | 'playing' | 'ended';
}

export interface RoomCreateRequest extends BaseRequest {
	game: GameType;
	name: string;
}