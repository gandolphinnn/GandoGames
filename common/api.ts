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

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface Statistic {
	name: string;
	value: number;
}

export interface UpdateStatsRequest {
	playFabId: string;
	statistics: Statistic[];
}

export interface LeaderboardEntry {
	playFabId: string;
	displayName: string;
	value: number;
	position: number;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export interface RoomPlayer {
	playFabId: string;
	name: string;
	lives: number;
}

export interface RevealResult {
	wasLying: boolean;
	loserIndex: number;
	declared: number;
	actual: number;
}

export interface RoomSummary {
	roomId: string;
	players: string[];
	createdAt: string;
}

export interface RoomState {
	phase: 'waiting' | 'playing' | 'game-over';
	hostId: string;
	players: RoomPlayer[];
	currentPlayerIndex: number;
	previousDeclaration: number | null;
	previousPlayerIndex: number | null;
	gamePhase: 'turn-start' | 'result' | 'game-over';
	revealResult: RevealResult | null;
	winnerName: string | null;
	lastUpdated: string;
}

// ── Room requests ─────────────────────────────────────────────────────────────

export interface CreateRoomRequest {
	sessionTicket: string;
	playerName: string;
}

export interface JoinRoomRequest {
	sessionTicket: string;
	roomCode: string;
	playerName: string;
}

export interface StartRoomRequest {
	sessionTicket: string;
}

// ── Game actions ──────────────────────────────────────────────────────────────

export type GameActionType = 'declare' | 'call-false' | 'next-turn';

export interface GameActionRequest {
	sessionTicket: string;
	type: GameActionType;
	declaration?: number;
	actualRoll?: number;
}
