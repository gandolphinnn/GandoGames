import { GamePlayer } from "./game";

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
	player: GamePlayer;
	sessionTicket: string;
}

/** Base request for logged users */
export interface BaseRequest {
	sessionTicket: string;
}