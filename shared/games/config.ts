import { GameType } from "..";

export interface BaseGameDescriptor {
	minPlayers: number,
	maxPlayers: number,
	supportsBots: boolean,
}
/**
 * Per-game player limits, keyed by game type. The single source of truth shared by the API
 * (join/start validation) and the site (game registry / lobby UI), so the two can never disagree.
 */
export const GAMES_CONFIG: Record<GameType, BaseGameDescriptor> = {
	'pankov': {
		minPlayers: 2,
		maxPlayers: 6,
		supportsBots: true,
	},
	'poker': {
		minPlayers: 2,
		maxPlayers: 8,
		supportsBots: false,
	},
};
