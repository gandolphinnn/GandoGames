import { GamePlayer, GameId, GameData } from ".";

export interface ChatMessage {
	playerId: string;
	playerName: string;
	text: string;
	timestamp: Date;
}

/**
 * Who may discover and join a room — a single axis from most open to fully closed.
 * - `public`  — listed in the browse list; anyone may join.
 * - `link`    — hidden from the browse list; joinable only via an invite or by entering the room code.
 * - `closed`  — unlisted and frozen; no one new may join.
 */
export type RoomAccessPolicy = 'public' | 'link' | 'closed';

export interface RoomData extends GameData {
	id: string;
	hostId: string;
	access: RoomAccessPolicy;
	gameId: GameId;
	kickedPlayers: string[];
	chat: ChatMessage[];
	lastUpdate: Date;
}

export interface RoomCreateRequest {
	game: GameId;
}

export interface RoomAccessSetRequest {
	access: RoomAccessPolicy;
}

export interface RoomInviteRequest {
	/** PlayFab id of the friend being invited. */
	friendId: string;
}

export interface ChatSendRequest {
	text: string;
}