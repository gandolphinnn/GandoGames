import { GamePlayer, GameType } from './game'

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	username: string;
}

export interface GuestLoginRequest {
	customId: string;
}

export interface AuthResponse {
	id: string;
	sessionTicket: string;
}

/** Base request for logged users */
export interface AuthorizedRequest {
	sessionTicket: string;
}

/** Base request for logged users in a room */
export interface RoomRequest extends AuthorizedRequest {
	roomId: string;
}

export interface RoomResponse {
	
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export interface RoomPlayer {
	id: string;
	name: string;
}

export interface RoomState {
	phase: 'waiting' | 'playing' | 'ended';
	name: string;
	hostId: string;
	gameId: GameType;
	players: GamePlayer[];
}

export interface CreateRoomRequest extends AuthorizedRequest {
	game: GameType;
	name: string;
}