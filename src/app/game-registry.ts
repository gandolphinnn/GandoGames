export interface GameDescriptor {
	id: string;
	name: string;
	description: string;
}

export const GAME_REGISTRY: GameDescriptor[] = [
	{
		id: 'pankov',
		name: 'Pankov',
		description: 'Roll two dice and bluff your way to victory. Call out liars or lose a life.',
	},
	{
		id: 'trio',
		name: 'Trio',
		description: 'Coming soon',
	},
];
