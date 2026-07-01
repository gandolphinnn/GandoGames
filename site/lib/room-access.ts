import { RoomAccessPolicy } from '@gandogames/shared/dto';

/** UI metadata for an access policy — label, ionicon glyph and a one-line explanation. */
export interface RoomAccessOption {
	value: RoomAccessPolicy;
	label: string;
	/** ionicon name (registered in main.ts). */
	icon: string;
	description: string;
}

export const ROOM_ACCESS_OPTIONS: readonly RoomAccessOption[] = [
	{ value: 'public', label: 'Public', icon: 'globe', description: 'Anyone can find and join this room.' },
	{ value: 'friends', label: 'Friends only', icon: 'people', description: 'Only your friends can join — others see it locked.' },
	{ value: 'link', label: 'With link', icon: 'link', description: 'Hidden from the list. Joinable only with the room code or an invite.' },
	{ value: 'closed', label: 'Closed', icon: 'lock-closed', description: 'No one new can join.' },
];

export function roomAccessOption(value: RoomAccessPolicy): RoomAccessOption {
	return ROOM_ACCESS_OPTIONS.find(o => o.value === value) ?? ROOM_ACCESS_OPTIONS[0];
}
