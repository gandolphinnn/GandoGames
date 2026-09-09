import { GamePlayer, GameSettings, GameName } from ".";

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

export const ROOM_ACCESS_POLICIES: readonly RoomAccessPolicy[] = ['public', 'link', 'closed'];

/** Coerce an untrusted value to a valid access policy, defaulting to `public`. */
export function resolveAccessPolicy(value: unknown): RoomAccessPolicy {
	return ROOM_ACCESS_POLICIES.includes(value as RoomAccessPolicy) ? value as RoomAccessPolicy : 'public';
}

export interface RoomSummary {
	id: string;
	hostId: string;
	game: GameName;
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

export interface RoomCreateRequest {
	game: GameName;
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