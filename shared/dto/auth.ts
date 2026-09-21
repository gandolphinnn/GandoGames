import { LangCode } from "./languages";

export type Theme = 'dark' | 'light';
export type IconType = 'profile'| 'luck' | 'cookie' | 'paw' | 'pizza' | 'bot';

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

export type PlayerType = 'guest' | 'user' | 'bot';
export type PlayerRole = 'admin' | 'moderator' | '';

/** Profile preferences data */
export interface ProfileData {
	theme: Theme;
	icon: IconType;
	language: LangCode;
}

export interface GamePlayer extends ProfileData {
	/** Master player account ID */
	id: string;
	/** Title player account ID */
	entityId: string;
	name: string;
	role: PlayerRole;
	type: PlayerType;
}

export interface AuthResponse {
	player: GamePlayer;
	sessionTicket: string;
}

/** Partial profile update — only the provided fields change. */
export type ProfileUpdateRequest = Partial<ProfileData>;