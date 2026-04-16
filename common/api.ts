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
	SessionTicket: string;
	PlayFabId: string;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export interface RoomPlayer {
	playFabId: string;
	name: string;
}

export interface RoomSummary {
	roomId: string;
	players: string[];
	createdAt: string;
}

export interface RoomState {
	phase: 'waiting' | 'playing' | 'game-over';
	hostId: string;
	gameId: string;
	players: RoomPlayer[];
	lastUpdated: string;
	gameState: unknown;
}

// ── Room requests ─────────────────────────────────────────────────────────────

export interface CreateRoomRequest {
	sessionTicket: string;
	playerName: string;
	gameId: string;
}

export interface JoinRoomRequest {
	sessionTicket: string;
	roomCode: string;
	playerName: string;
}

export interface StartRoomRequest {
	sessionTicket: string;
}
