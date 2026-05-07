import { BaseRequest, GamePlayer, GameType } from "..";

/** Base request for logged users in a room */
export interface RoomBaseRequest extends BaseRequest {
	roomId: string;
}

export interface RoomHistoryEntry {
	description: string;
	timestamp: Date;
}

export interface RoomData {
	id: string;
	hostId: string;
	game: GameType;
	players: GamePlayer[];
	kickedPlayers: string[];
	phase: 'waiting' | 'playing' | 'ended';
	history: RoomHistoryEntry[];
	lastUpdate: Date;
}

export interface RoomCreateRequest extends BaseRequest {
	game: GameType;
}

export interface RoomKickRequest extends RoomBaseRequest {
	playerId: string;
}