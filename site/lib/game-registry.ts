import { InputSignal, OutputEmitterRef, Type } from "@angular/core";
import { GameSettingsSchema, GameState, GameId, GameConfig, GAMES_CONFIG } from "@gandogames/shared/dto";
import { MASTERMIND_SETTINGS_SCHEMA } from "@gandogames/shared/mastermind";
import { PANKOV_SETTINGS_SCHEMA } from '@gandogames/shared/pankov';
import { POKER_SETTINGS_SCHEMA } from '@gandogames/shared/poker';
import { TableVariant } from "@gandogames/lib/common/game-table";
import { MastermindGameComponent } from "@gandogames/lib/games/mastermind/mastermind-game.component";
import { PankovGameComponent } from "@gandogames/lib/games/pankov/pankov-game.component";
import { PokerGameComponent } from "@gandogames/lib/games/poker/poker-game.component";

export interface GameComponent<TState extends GameState = GameState> {
	gameState: InputSignal<TState | null>;
	loading: InputSignal<boolean>;
	myPlayFabId: InputSignal<string | null>;
	gameAction: OutputEmitterRef<{ action: string; data?: unknown }>;
	playAgain: OutputEmitterRef<void>;
}

interface GameInfo extends GameConfig {
	id: GameId;
	icon: string;
	/** Translation key: render with the `translate` pipe. */
	title: string;
	/** Translation key: render with the `translate` pipe. */
	description: string;
	component: Type<unknown>;
	/** Declarative schema for the per-room game-settings editor. */
	settingsSchema: GameSettingsSchema;
	/** Table look shared by this game's lobby and its in-game view. */
	tableVariant: TableVariant;
}

export const GAME_REGISTRY: Record<GameId, GameInfo> = {
	mastermind: {
		id: 'mastermind',
		icon: 'fa-solid fa-brain',
		title: 'GAME.MASTERMIND.TITLE',
		description: 'GAME.MASTERMIND.DESCRIPTION',
		...GAMES_CONFIG.mastermind,
		component: MastermindGameComponent,
		settingsSchema: MASTERMIND_SETTINGS_SCHEMA,
		tableVariant: 'neutral',
	},
	pankov: {
		id: 'pankov',
		icon: 'fa-solid fa-dice',
		title: 'GAME.PANKOV.TITLE',
		description: 'GAME.PANKOV.DESCRIPTION',
		...GAMES_CONFIG.pankov,
		component: PankovGameComponent,
		settingsSchema: PANKOV_SETTINGS_SCHEMA,
		tableVariant: 'neutral',
	},
	poker: {
		id: 'poker',
		icon: 'fa-solid fa-hat-cowboy',
		title: 'GAME.POKER.TITLE',
		description: 'GAME.POKER.DESCRIPTION',
		...GAMES_CONFIG.poker,
		component: PokerGameComponent,
		settingsSchema: POKER_SETTINGS_SCHEMA,
		tableVariant: 'felt',
	},
};
