import { InputSignal, OutputEmitterRef, Type } from "@angular/core";
import { GameSettingsSchema, GameState, GameType } from "@gandogames/shared/dto";
import { TablePreset } from '@gandogames/lib/common/game-table';
import { PankovGameComponent, PANKOV_SETTINGS_SCHEMA, PANKOV_TABLE_PRESET } from '@gandogames/lib/games/pankov';
import { PokerGameComponent, POKER_SETTINGS_SCHEMA, POKER_TABLE_PRESET } from '@gandogames/lib/games/poker';

export interface GameComponent<TState extends GameState = GameState> {
	gameState: InputSignal<TState | null>;
	loading: InputSignal<boolean>;
	error: InputSignal<string | null>;
	myPlayFabId: InputSignal<string | null>;
	gameAction: OutputEmitterRef<{ action: string; data?: unknown }>;
	back: OutputEmitterRef<void>;
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

export const GAME_REGISTRY: Record<GameType, GameDescriptor> = {
	pankov: {
		id: 'pankov',
		name: 'Pankov',
		icon: 'fa-solid fa-dice',
		description: 'Roll two dice and bluff your way to victory. Call out liars or lose a life.',
		minPlayers: 2,
		maxPlayers: 6,
		component: PankovGameComponent,
		settingsSchema: PANKOV_SETTINGS_SCHEMA,
		table: PANKOV_TABLE_PRESET,
	},
	poker: {
		id: 'poker',
		name: 'Texas Hold\'em',
		icon: 'fa-solid fa-heart',
		description: 'Bet, bluff, and outlast everyone at the table.',
		minPlayers: 2,
		maxPlayers: 8,
		component: PokerGameComponent,
		settingsSchema: POKER_SETTINGS_SCHEMA,
		table: POKER_TABLE_PRESET,
	},
};
