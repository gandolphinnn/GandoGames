import { InputSignal, OutputEmitterRef, Type } from "@angular/core";
import { GameSettingsSchema, GameState, GameType } from "@gandogames/shared/dto";
import { BaseGameDescriptor, GAMES_CONFIG } from '@gandogames/shared/config';
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

interface GameDescriptor extends BaseGameDescriptor {
	id: GameType;
	name: string;
	icon: string;
	/** Translation key: render with the `translate` pipe. */
	description: string;
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
		description: 'GAMES.PANKOV.DESCRIPTION',
		...GAMES_CONFIG.pankov,
		component: PankovGameComponent,
		settingsSchema: PANKOV_SETTINGS_SCHEMA,
		table: PANKOV_TABLE_PRESET,
	},
	poker: {
		id: 'poker',
		name: 'Texas Hold\'em',
		icon: 'fa-solid fa-hat-cowboy',
		description: 'GAMES.POKER.DESCRIPTION',
		...GAMES_CONFIG.poker,
		component: PokerGameComponent,
		settingsSchema: POKER_SETTINGS_SCHEMA,
		table: POKER_TABLE_PRESET,
	},
};
