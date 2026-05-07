export type { PankovPlayer, PankovGameState, PankovRoomState, RevealResult, RollValue } from '@gandogames/common/pankov';

export function formatValue(value: number): string {
	if (value === 21) return 'Pankov!';
	const high = Math.floor(value / 10);
	const low = value % 10;
	if (high === low) return `Pair of ${high}s`;
	return `${high}-${low}`;
}

export const INITIAL_LIVES = 8;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const ROLL_VALUES = [
	31, 32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65,
	11, 22, 33, 44, 55, 66,
	21,
] as const;

const RANK_MAP = new Map<number, number>(ROLL_VALUES.map((v, i) => [v, i]));

export function getRank(value: number): number {
	return RANK_MAP.get(value) ?? -1;
}

export function rollToValue(d1: number, d2: number): number {
	return Math.max(d1, d2) * 10 + Math.min(d1, d2);
}
