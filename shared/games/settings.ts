import { GameSettings, GameSettingsSchema, GameType } from "..";
import { DEFAULT_PANKOV_SETTINGS, PANKOV_SETTINGS_SCHEMA } from "./pankov";
import { DEFAULT_POKER_SETTINGS, POKER_SETTINGS_SCHEMA } from "./poker";
import { BATTLESHIP_SETTINGS_SCHEMA, DEFAULT_BATTLESHIP_SETTINGS } from "./battleship";

/**
 * Per-game settings schema + defaults, keyed by game type. The single backend-side lookup for
 * validating a host's settings edit and for filling a room's defaults. The site reaches the same
 * schemas through each game's package (see lib/game-registry), so both sides share one definition.
 */
export const GAME_SETTINGS: Record<GameType, { schema: GameSettingsSchema; defaults: GameSettings }> = {
	pankov: { schema: PANKOV_SETTINGS_SCHEMA, defaults: DEFAULT_PANKOV_SETTINGS as unknown as GameSettings },
	poker: { schema: POKER_SETTINGS_SCHEMA, defaults: DEFAULT_POKER_SETTINGS as unknown as GameSettings },
	battleship: { schema: BATTLESHIP_SETTINGS_SCHEMA, defaults: DEFAULT_BATTLESHIP_SETTINGS },
};
