export type Theme = 'dark' | 'light';
export type LangCode = 'en' | 'it';
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

export interface GamePlayer extends ProfileData {
	id: string;
	name: string;
	isGuest: boolean;
}

/** Minimal player shape needed to render an avatar (id drives the colour hash, icon the glyph). */
export type AvatarPlayer = Pick<GamePlayer, 'id' | 'icon'>;

export interface AuthResponse {
	player: GamePlayer;
	sessionTicket: string;
}

/** Base request for logged users */
export interface BaseRequest {
	sessionTicket: string;
}

export interface ProfileUpdateRequest extends BaseRequest, Partial<ProfileData> { }