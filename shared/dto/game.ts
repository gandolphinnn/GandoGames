import { RoomBaseRequest } from "./room";

export type GameType = 'pankov' | 'poker';

export interface GameState {
	lastUpdate: Date;
}

export interface GameBaseRequest extends RoomBaseRequest {
	game: GameType,
}

export interface GameActionRequest extends GameBaseRequest {
	action: string,
	data: any,
}

// ── Game settings ──────────────────────────────────────────────────────────────────
// Per-room, game-specific configuration the host tunes in the lobby before the game starts.
// Each game declares a schema (the field list below); one shared modal renders any game's form,
// and the same schema drives server-side validation. Values are primitives so settings stay
// trivially serializable (stored on the room, broadcast via SignalR).

export type SettingValue = number | boolean;
export type GameSettings = Record<string, SettingValue>;

/** One configurable field in a game's settings schema. */
export interface SettingField {
	key: string;
	type: 'number' | 'toggle';
	label: string;
	default: SettingValue;
	/** Numeric bounds/step — used by `type: 'number'` only. */
	min?: number;
	max?: number;
	step?: number;
	/** Optional helper text shown under the field. */
	hint?: string;
}

export type GameSettingsSchema = readonly SettingField[];

export interface GameSettingsSetRequest extends GameBaseRequest {
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
		} else {
			let n = typeof value === 'number' && Number.isFinite(value) ? value : Number(field.default);
			if (field.min !== undefined) n = Math.max(field.min, n);
			if (field.max !== undefined) n = Math.min(field.max, n);
			out[field.key] = Math.round(n);
		}
	}
	return out;
}
