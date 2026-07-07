import { InputSignal, OutputEmitterRef, Type } from "@angular/core";
import { GameSettingsSchema, GameState, GameType } from "@gandogames/shared/dto";
import { GAMES_CONFIG } from '@gandogames/shared/config';
import { PANKOV_SETTINGS_SCHEMA } from '@gandogames/shared/pankov';
import { POKER_SETTINGS_SCHEMA } from '@gandogames/shared/poker';
import { TablePreset } from '@gandogames/lib/common/game-table';
import { PankovGameComponent, PANKOV_TABLE_PRESET } from '@gandogames/lib/games/pankov';
import { PokerGameComponent, POKER_TABLE_PRESET } from '@gandogames/lib/games/poker';

export interface GameComponent<TState extends GameState = GameState> {
	gameState: InputSignal<TState | null>;
	loading: InputSignal<boolean>;
	error: InputSignal<string | null>;
	myPlayFabId: InputSignal<string | null>;
	gameAction: OutputEmitterRef<{ action: string; data?: unknown }>;
	playAgain: OutputEmitterRef<void>;
}

interface GameDescriptor {
	id: GameType;
	name: string;
	icon: string;
	description: string;
	minPlayers: number;
	maxPlayers: number;
	component: Type<unknown>;
	/** Declarative schema for the per-room game-settings editor. */
	settingsSchema: GameSettingsSchema;
	/** Table look shared by this game's lobby and its in-game view. */
	table: TablePreset;
}

/** Human label for a game's player count: "2 players" when fixed (min === max), else "2–6 players". */
export function playerCountLabel(game: { minPlayers: number; maxPlayers: number }): string {
	return game.minPlayers === game.maxPlayers
		? `${game.minPlayers} players`
		: `${game.minPlayers}–${game.maxPlayers} players`;
}

export const GAME_REGISTRY: Record<GameType, GameDescriptor> = {
	pankov: {
		id: 'pankov',
		name: 'Pankov',
		icon: 'fa-solid fa-dice',
		description: 'Roll two dice and bluff your way to victory. Call out liars or lose a life.',
		...GAMES_CONFIG.pankov,
		component: PankovGameComponent,
		settingsSchema: PANKOV_SETTINGS_SCHEMA,
		table: PANKOV_TABLE_PRESET,
	},
	poker: {
		id: 'poker',
		name: 'Texas Hold\'em',
		icon: 'fa-solid fa-hat-cowboy',
		description: 'Bet, bluff, and outlast everyone at the table.',
		...GAMES_CONFIG.poker,
		component: PokerGameComponent,
		settingsSchema: POKER_SETTINGS_SCHEMA,
		table: POKER_TABLE_PRESET,
	},
};
