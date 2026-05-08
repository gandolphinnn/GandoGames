export interface PlayerIcon {
	id: string;
	label: string;
	fa: string;
}

export const PLAYER_ICONS: PlayerIcon[] = [
	{ id: 'start', label: 'Start', fa: 'fa-solid fa-star' },
	{ id: 'clover', label: 'Clover', fa: 'fa-solid fa-clover' },
	{ id: 'dice', label: 'Dice', fa: 'fa-solid fa-dice' },
	{ id: 'paw', label: 'Paw', fa: 'fa-solid fa-paw' },
	{ id: 'atom', label: 'Atom', fa: 'fa-solid fa-atom' },
];
