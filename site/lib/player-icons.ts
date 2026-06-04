import { IconType } from "@gandogames/shared/api";

export interface PlayerIcon {
	id: IconType;
	label: string;
	class: string;
	reserved?: boolean;
}

export const PLAYER_ICONS: PlayerIcon[] = [
	{ id: 'profile', label: 'Profile', class: 'fas fa-user' },
	{ id: 'luck',    label: 'Clover',  class: 'fas fa-clover' },
	{ id: 'hat',     label: 'Cowboy',  class: 'fas fa-hat-cowboy' },
	{ id: 'paw',     label: 'Paw',     class: 'fas fa-paw' },
	{ id: 'pizza',   label: 'Pizza',   class: 'fas fa-pizza-slice' },
	{ id: 'bot',     label: 'Bot',     class: 'fas fa-robot', reserved: true },
];

export const LANGUAGES = [
	{ value: 'en', text: 'English' },
	{ value: 'it', text: 'Italiano' },
];