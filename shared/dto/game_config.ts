export type GameCategory = 'local' | 'single' | 'room';

export interface BaseGameDescriptor {
	minPlayers: number;
	maxPlayers: number;
	supportsBots: boolean;
	category: GameCategory;
}

export type GameName = 'pankov' | 'poker' | 'mastermind';
export const GAMES_CONFIG: Record<GameName, BaseGameDescriptor> = {
	pankov: {
		minPlayers: 2,
		maxPlayers: 6,
		supportsBots: true,
		category: 'room',
	},
	poker: {
		minPlayers: 2,
		maxPlayers: 8,
		supportsBots: false,
		category: 'room',
	},
	mastermind: {
		minPlayers: 1,
		maxPlayers: 1,
		supportsBots: false,
		category: 'single',
	},
};