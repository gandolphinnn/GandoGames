import { RoomAccessPolicy } from '@gandogames/shared/dto';

/** UI metadata for an access policy — i18n label/description keys and an ionicon glyph. */
export interface RoomAccessOption {
	value: RoomAccessPolicy;
	/** Translation key: render with the `translate` pipe. */
	label: string;
	/** ionicon name (registered in main.ts). */
	icon: string;
	/** Translation key: render with the `translate` pipe. */
	description: string;
}

export const ROOM_ACCESS_OPTIONS: readonly RoomAccessOption[] = [
	{ value: 'public', label: 'ROOM_ACCESS.PUBLIC.LABEL', icon: 'globe', description: 'ROOM_ACCESS.PUBLIC.DESCRIPTION' },
	{ value: 'friends', label: 'ROOM_ACCESS.FRIENDS.LABEL', icon: 'people', description: 'ROOM_ACCESS.FRIENDS.DESCRIPTION' },
	{ value: 'link', label: 'ROOM_ACCESS.LINK.LABEL', icon: 'link', description: 'ROOM_ACCESS.LINK.DESCRIPTION' },
	{ value: 'closed', label: 'ROOM_ACCESS.CLOSED.LABEL', icon: 'lock-closed', description: 'ROOM_ACCESS.CLOSED.DESCRIPTION' },
];

export function roomAccessOption(value: RoomAccessPolicy): RoomAccessOption {
	return ROOM_ACCESS_OPTIONS.find(o => o.value === value) ?? ROOM_ACCESS_OPTIONS[0];
}
