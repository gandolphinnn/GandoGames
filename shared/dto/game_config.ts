export type GameId = 'pankov' | 'poker' | 'mastermind';

export type GameCategory = 'single' | 'room';
export interface GameConfig {
	minPlayers: number;
	maxPlayers: number;
	supportsBots: boolean;
	category: GameCategory;
}

export const GAMES_CONFIG: Record<GameId, GameConfig> = {
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