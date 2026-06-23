import { BaseRequest, GamePlayer, GameSettings, GameType } from "..";

/** Base request for logged users in a room */
export interface RoomBaseRequest extends BaseRequest {
	roomId: string;
}

export interface ChatMessage {
	playerId: string;
	playerName: string;
	text: string;
	timestamp: Date;
}

export interface RoomSummary {
	id: string;
	hostId: string;
	game: GameType;
	players: GamePlayer[];
	phase: 'waiting' | 'playing' | 'ended';
}

export interface RoomData extends RoomSummary {
	kickedPlayers: string[];
	chat: ChatMessage[];
	/** Host-chosen game settings for this room; undefined until set (server resolves to defaults). */
	settings?: GameSettings;
	lastUpdate: Date;
}

export interface RoomCreateRequest extends BaseRequest {
	game: GameType;
}

export interface RoomKickRequest extends RoomBaseRequest {
	playerId: string;
}

export interface RoomInviteRequest extends RoomBaseRequest {
	/** PlayFab id of the friend being invited. */
	friendId: string;
}

export interface ChatSendRequest extends RoomBaseRequest {
	text: string;
}