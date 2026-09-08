import { GameName } from "..";

export type GameCategory = 'local' | 'single' | 'room';

export interface BaseGameDescriptor {
	minPlayers: number;
	maxPlayers: number;
	supportsBots: boolean;
	category: GameCategory;
}
/**
 * Per-game player limits, keyed by game name. The single source of truth shared by the API
 * (join/start validation) and the site (game registry / lobby UI), so the two can never disagree.
 */
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
};
