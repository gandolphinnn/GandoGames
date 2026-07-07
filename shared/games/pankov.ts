import { GamePlayer, GameSettings, GameSettingsSchema, GameState, resolveSettings } from "..";

export type RollValue =
	| 31 | 32 | 41 | 42 | 43 | 51 | 52 | 53 | 54 | 61 | 62 | 63 | 64 | 65
	| 11 | 22 | 33 | 44 | 55 | 66
	| 21;

export interface PankovPlayer extends GamePlayer {
	lives: number,
}

export interface RevealResult {
	declared: RollValue,
	actual: RollValue,
	wasLying: boolean,
	loserIndex: number,
	/** Lives the loser lost — 1 normally, doubled under the sudden-death Pankov run. */
	livesLost: number,
}

export interface PankovSettings {
	/** Lives each player starts with. */
	initialLives: number;
	/** When on, a wrongly-challenged player loses 2^(pankovStreak-1) lives during a Pankov run. */
	suddenDeath: boolean;
}

export interface PankovGameState extends GameState {
	gamePhase: 'turn-start' | 'rolled' | 'result' | 'game-over',
	players: PankovPlayer[],
	currentPlayerIndex: number,
	previousPlayerIndex: number | null,
	previousDeclaration: RollValue | null,
	/** Hidden: actual roll of the previous declarer. Always null in public state. */
	previousActualRoll: RollValue | null,
	/** Hidden: current player's roll. Null for all other players. */
	currentRoll: RollValue | null,
	settings: PankovSettings,
	/** Count of consecutive Pankov (21) declarations in the current run; drives sudden-death stakes. */
	pankovStreak: number,
	winnerName?: string,
	revealResult?: RevealResult,
}

export const INITIAL_LIVES = 8;

/** The Pankov roll (2-1) — the single strongest value; nothing outranks it. */
export const PANKOV_VALUE: RollValue = 21;

export const PANKOV_SETTINGS_SCHEMA: GameSettingsSchema = [
	{ key: 'initialLives', type: 'number', label: 'Lives', default: INITIAL_LIVES, min: 1, max: 20, step: 1, hint: 'Lives each player starts with.' },
	{ key: 'suddenDeath', type: 'toggle', label: 'Sudden death', default: false, hint: 'On a Pankov run, a wrong challenge costs double each consecutive turn (1, 2, 4, …).' },
];

/** Normalize raw settings into a fully-typed, validated PankovSettings (defaults + clamping). */
export function resolvePankovSettings(raw?: GameSettings): PankovSettings {
	return resolveSettings(PANKOV_SETTINGS_SCHEMA, raw) as unknown as PankovSettings;
}

/** All roll values, ordered weakest → strongest (Pankov is the highest). */
export const ROLL_VALUES: readonly RollValue[] = [
	31, 32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65,
	11, 22, 33, 44, 55, 66,
	21,
];

const RANK_MAP = new Map<number, number>(ROLL_VALUES.map((v, i) => [v, i]));

/** Strength rank of a roll value (higher = stronger); -1 if not a valid value. */
export function getRank(value: number): number {
	return RANK_MAP.get(value) ?? -1;
}

/** Combine two dice into the canonical roll value (higher die first). */
export function rollToValue(d1: number, d2: number): RollValue {
	const high = Math.max(d1, d2);
	const low = Math.min(d1, d2);
	return (high * 10 + low) as RollValue;
}

/** Human-readable label for a roll value. */
export function formatValue(value: RollValue): string {
	if (value === 21) return 'Pankov!';
	const high = Math.floor(value / 10);
	const low = value % 10;
	if (high === low) return `Pair of ${high}s`;
	return `${high}-${low}`;
}
