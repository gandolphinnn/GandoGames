export type Permission = 'admin';

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

export interface GamePlayer {
	id: string;
	name: string;
	permissions?: Permission[];
	icon?: string;
}

export interface AuthResponse {
	player: GamePlayer;
	sessionTicket: string;
}

/** Base request for logged users */
export interface BaseRequest {
	sessionTicket: string;
}

export interface UpdateIconRequest extends BaseRequest {
	icon: string;
}