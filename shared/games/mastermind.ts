import { GamePlayer, GameSettings, GameSettingsSchema, GameState, resolveSettings } from "../dto";

// TODO
export type Colors =
'';

export type MastermindGuess = number
export type MastermindScore = number


export interface MastermindSettings extends GameSettings {
	/** The length of the secret code to guess. */
	codeLength: 4 | 5;
}

export interface MastermindTurn {
	guess: MastermindGuess;
	score: MastermindScore;
}

export interface MastermindGameState extends GameState<GamePlayer, MastermindSettings> {
	turns: MastermindTurn[];
}

export const MASTERMIND_SETTINGS_SCHEMA: GameSettingsSchema = [
	{ key: 'codeLength', type: 'number', label: 'Code length', default: 5, min: 4, max: 5, step: 1, hint: 'The length of the secret code to guess.' },
];

/** Normalize raw settings into a fully-typed, validated MastermindSettings (defaults + clamping). */
export function resolveMastermindSettings(raw?: GameSettings): MastermindSettings {
	return resolveSettings(MASTERMIND_SETTINGS_SCHEMA, raw) as unknown as MastermindSettings;
}