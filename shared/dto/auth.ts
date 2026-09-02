import { LangCode } from "./languages";

export type Theme = 'dark' | 'light';
export type IconType = 'profile'| 'luck' | 'cookie' | 'paw' | 'pizza' | 'bot';

/** Profile preferences data */
export interface ProfileData {
	theme: Theme;
	icon: IconType;
	language: LangCode;
}
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

export interface GamePlayer extends ProfileData {
	id: string;
	name: string;
	role: PlayerRole;
	type: PlayerType;
}

export function buildPlayer(id: string, name: string): GamePlayer {
	return {
		id,
		name,
		type: 'user',
		icon: 'profile',
		theme: 'light',
		language: 'en',
		role: '',
	};
}

export function buildBot(id: string, name: string): GamePlayer {
	return {
		id,
		name,
		type: 'bot',
		icon: 'bot',
		theme: 'light',
		language: 'en',
		role: '',
	};
}

/** Minimal player shape needed to render an avatar (id drives the colour hash, icon the glyph). */
export type AvatarPlayer = Pick<GamePlayer, 'id' | 'icon'>;

export interface AuthResponse {
	player: GamePlayer;
	sessionTicket: string;
}

/** Partial profile update — only the provided fields change. */
export type ProfileUpdateRequest = Partial<ProfileData>;