import { GamePlayer, GameSettings, GameSettingsSchema, GameState, resolveSettings } from "../dto";

// TODO
export type Colors =
'';


export interface MastermindSettings extends GameSettings {
	/** The length of the secret code to guess. */
	codeLength: 4 | 5;
	/**  */
	suddenDeath: boolean;
	/** When off, the first player is always the host */
	randomStartingPlayer: boolean;
}

export interface MastermindTurn {
	guess: number; //TODO
	score: number; //TODO
}

export interface MastermindGameState extends GameState<GamePlayer, MastermindSettings> {
	previousTurns: MastermindTurn[];
}

export const MASTERMIND_SETTINGS_SCHEMA: GameSettingsSchema = [
];

/** Normalize raw settings into a fully-typed, validated MastermindSettings (defaults + clamping). */
export function resolveMastermindSettings(raw?: GameSettings): MastermindSettings {
	return resolveSettings(MASTERMIND_SETTINGS_SCHEMA, raw) as unknown as MastermindSettings;
}