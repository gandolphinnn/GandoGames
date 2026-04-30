import { GameType } from "@gandogames/common/api";

export interface GameDescriptor {
	id: GameType;
	name: string;
	icon: string;
	description: string;
	minPlayers: number;
	maxPlayers: number;
}

export const GAME_REGISTRY: GameDescriptor[] = [
	{
		id: 'morra',
		name: 'Morra',
		icon: 'fa-solid fa-hand-fist',
		description: 'Classic rock paper scissors — pick your hand and outlast your opponent.',
		minPlayers: 2,
		maxPlayers: 2,
	},
	{
		id: 'pankov',
		name: 'Pankov',
		icon: 'fa-solid fa-dice',
		description: 'Roll two dice and bluff your way to victory. Call out liars or lose a life.',
		minPlayers: 2,
		maxPlayers: 6,
	},
];
