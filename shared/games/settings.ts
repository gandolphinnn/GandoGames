import { GameName, GameSettingsSchema } from "../dto";
import { PANKOV_SETTINGS_SCHEMA } from "./pankov";
import { POKER_SETTINGS_SCHEMA } from "./poker";
import { MASTERMIND_SETTINGS_SCHEMA } from "./mastermind";

/**
 * Per-game settings schema, keyed by game type. The single backend-side lookup for validating a
 * host's settings edit (defaults are filled from each field's `default` by `resolveSettings`).
 * The site reaches the same schemas through the game registry, so both sides share one definition.
 */
export const GAME_SETTINGS: Record<GameName, GameSettingsSchema> = {
	pankov: PANKOV_SETTINGS_SCHEMA,
	poker: POKER_SETTINGS_SCHEMA,
	mastermind: MASTERMIND_SETTINGS_SCHEMA,
};
