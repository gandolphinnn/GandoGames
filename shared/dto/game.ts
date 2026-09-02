export type GameType = 'pankov' | 'poker';

export interface GameState {
	lastUpdate: Date;
}

/** Which game's state to load (the room travels as the `{roomId}` path segment). */
export interface GameStateRequest {
	game: GameType,
}

export interface GameActionRequest {
	game: GameType,
	action: string,
	data: any,
}

// ── Game settings ──────────────────────────────────────────────────────────────────
// Per-room, game-specific configuration the host tunes in the lobby before the game starts.
// Each game declares a schema (the field list below); one shared modal renders any game's form,
// and the same schema drives server-side validation. Values are primitives so settings stay
// trivially serializable (stored on the room, broadcast via SignalR).

/**
 * One entry in a blinds schedule: the big blind for this level and how long it lasts (minutes).
 * Small blind is always half the big blind (floored). The last level is terminal — it runs until the
 * game ends — so its `durationMinutes` is meaningless and normalized to 0 ("unlimited").
 */
export interface BlindLevel {
	bigBlind: number;
	durationMinutes: number;
}

export type SettingValue = number | boolean | BlindLevel[];
export type GameSettings = Record<string, SettingValue>;

/** One configurable field in a game's settings schema. */
export interface SettingField {
	key: string;
	type: 'number' | 'toggle' | 'blind-levels';
	label: string;
	default: SettingValue;
	/** Numeric bounds/step — used by `type: 'number'`, and by `blind-levels` to bound each big blind. */
	min?: number;
	max?: number;
	step?: number;
	/** Optional helper text shown under the field. */
	hint?: string;
}

export type GameSettingsSchema = readonly SettingField[];

export interface GameSettingsSetRequest {
	settings: GameSettings;
}

/**
 * Normalize a raw settings object against a schema: fill missing keys with defaults, clamp numbers
 * into [min, max], coerce booleans, and drop any key the schema doesn't define. The single
 * source of truth for "valid settings", used by the API (validating a host's edit) and the client
 * (pre-filling the editor). Never trusts the incoming shape — unknown keys can't leak through.
 */
export function resolveSettings(schema: GameSettingsSchema, raw?: GameSettings): GameSettings {
	const out: GameSettings = {};
	for (const field of schema) {
		const value = raw?.[field.key];
		if (field.type === 'toggle') {
			out[field.key] = typeof value === 'boolean' ? value : Boolean(field.default);
		} else if (field.type === 'blind-levels') {
			out[field.key] = resolveBlindLevels(field, value);
		} else {
			let n = typeof value === 'number' && Number.isFinite(value) ? value : Number(field.default);
			if (field.min !== undefined) n = Math.max(field.min, n);
			if (field.max !== undefined) n = Math.min(field.max, n);
			out[field.key] = Math.round(n);
		}
	}
	return out;
}

/** Upper bound on any single (non-terminal) blind level's duration. */
const MAX_LEVEL_MINUTES = 1440; // 24h

/**
 * Validate/normalize a blinds schedule against a schema field: clamp each big blind into the field's
 * [min, max], round durations to whole minutes ≥ 1, drop malformed entries, and always keep at least
 * one level (falling back to the field default). The final level is terminal, so its duration is wiped
 * to 0 ("unlimited"). Never trusts the incoming shape.
 */
function resolveBlindLevels(field: SettingField, value: SettingValue | undefined): BlindLevel[] {
	const fallback = (field.default as BlindLevel[]).map(l => ({ ...l }));
	const source = Array.isArray(value) ? value : fallback;
	const clampBb = (bb: number): number => {
		let n = typeof bb === 'number' && Number.isFinite(bb) ? bb : 0;
		if (field.min !== undefined) n = Math.max(field.min, n);
		if (field.max !== undefined) n = Math.min(field.max, n);
		return Math.round(n);
	};
	let levels = source
		.filter((l): l is BlindLevel => !!l && typeof (l as BlindLevel).bigBlind === 'number')
		.map(l => ({
			bigBlind: clampBb(l.bigBlind),
			durationMinutes: Math.min(MAX_LEVEL_MINUTES, Math.max(1, Math.round(Number(l.durationMinutes) || 1))),
		}));
	if (levels.length === 0) levels = fallback;
	// The final level runs until the game ends, so its duration carries no meaning.
	levels[levels.length - 1]!.durationMinutes = 0;
	return levels;
}
