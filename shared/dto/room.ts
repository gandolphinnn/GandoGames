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

/**
 * Who may discover and join a room — a single axis from most open to fully closed.
 * - `public`  — listed in the browse list; anyone may join.
 * - `friends` — listed, but only the host's friends may join (others see it locked).
 * - `link`    — hidden from the browse list; joinable only via an invite or by entering the room code.
 * - `closed`  — unlisted and frozen; no one new may join.
 */
export type RoomAccessPolicy = 'public' | 'friends' | 'link' | 'closed';

export interface RoomSummary {
	id: string;
	hostId: string;
	game: GameType;
	players: GamePlayer[];
	phase: 'waiting' | 'playing' | 'ended';
	/** Who may discover/join this room. */
	access: RoomAccessPolicy;
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

export interface RoomAccessSetRequest extends RoomBaseRequest {
	access: RoomAccessPolicy;
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