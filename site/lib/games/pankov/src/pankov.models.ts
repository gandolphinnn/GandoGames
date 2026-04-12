export type GamePhase =
	| 'setup'
	| 'turn-start'
	| 'rolled'
	| 'passing'
	| 'reveal'
	| 'game-over';

export interface Player {
	name: string;
	lives: number;
}

export interface CallResult {
	wasLying: boolean;
	loserIndex: number;
}

export const INITIAL_LIVES = 8;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/**
 * All valid roll values in ascending order.
 *
 * A value is computed as: max(d1,d2) * 10 + min(d1,d2)
 * Doubles (couples) beat all non-doubles.
 * Pankov (2-1 → value 21) beats everything.
 *
 * Scale: 31 < 32 < 41 < 42 < 43 < 51 < 52 < 53 < 54
 *      < 61 < 62 < 63 < 64 < 65
 *      < 11 < 22 < 33 < 44 < 55 < 66
 *      < 21 (Pankov)
 */
export const ROLL_VALUES = [
	31, 32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65,
	11, 22, 33, 44, 55, 66,
	21,
] as const;

export type RollValue = (typeof ROLL_VALUES)[number];

const RANK_MAP = new Map<number, number>(ROLL_VALUES.map((v, i) => [v, i]));

/** Returns the rank (0 = lowest, 20 = Pankov) of a roll value. */
export function getRank(value: number): number {
	return RANK_MAP.get(value) ?? -1;
}

/** Computes the roll value from two dice faces. */
export function rollToValue(d1: number, d2: number): RollValue {
	const high = Math.max(d1, d2);
	const low = Math.min(d1, d2);
	return (high * 10 + low) as RollValue;
}

/** Full display name of a roll value. */
export function formatValue(value: number): string {
	if (value === 21) return 'Pankov';
	const high = Math.floor(value / 10);
	const low = value % 10;
	if (high === low) return `Pair of ${high}`;
	return `${high}${low}`;
}
