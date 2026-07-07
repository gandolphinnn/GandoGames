import { InputSignal, OutputEmitterRef, Type } from "@angular/core";
import { GameSettingsSchema, GameState, GameType } from "@gandogames/shared/dto";
import { TablePreset } from '@gandogames/lib/common/game-table';
import { PankovGameComponent, PANKOV_SETTINGS_SCHEMA, PANKOV_TABLE_PRESET } from '@gandogames/lib/games/pankov';
import { PokerGameComponent, POKER_SETTINGS_SCHEMA, POKER_TABLE_PRESET } from '@gandogames/lib/games/poker';
import { BattleshipGameComponent, BATTLESHIP_SETTINGS_SCHEMA, BATTLESHIP_TABLE_PRESET } from '@gandogames/lib/games/battleship';

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
		minPlayers: 2,
		maxPlayers: 6,
		component: PankovGameComponent,
		settingsSchema: PANKOV_SETTINGS_SCHEMA,
		table: PANKOV_TABLE_PRESET,
	},
	poker: {
		id: 'poker',
		name: 'Texas Hold\'em',
		icon: 'fa-solid fa-hat-cowboy',
		description: 'Bet, bluff, and outlast everyone at the table.',
		minPlayers: 2,
		maxPlayers: 8,
		component: PokerGameComponent,
		settingsSchema: POKER_SETTINGS_SCHEMA,
		table: POKER_TABLE_PRESET,
	},
	battleship: {
		id: 'battleship',
		name: 'Battleship',
		icon: 'fa-solid fa-ship',
		description: 'Hide your fleet, hunt theirs. Sink all 5 enemy ships to win.',
		minPlayers: 2,
		maxPlayers: 2,
		component: BattleshipGameComponent,
		settingsSchema: BATTLESHIP_SETTINGS_SCHEMA,
		table: BATTLESHIP_TABLE_PRESET,
	},
};
