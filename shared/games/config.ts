import { GameType } from "..";

/**
 * Per-game player limits, keyed by game type. The single source of truth shared by the API
 * (join/start validation) and the site (game registry / lobby UI), so the two can never disagree.
 */
export const GAMES_CONFIG: Record<GameType, {
	minPlayers: number,
	maxPlayers: number,
}> = {
	'pankov': {
		minPlayers: 2,
		maxPlayers: 6,
	},
	'poker': {
		minPlayers: 2,
		maxPlayers: 8,
	},
};
