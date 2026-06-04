import { InputSignal, OutputEmitterRef, Type } from "@angular/core";
import { GameState, GameType } from "@gandogames/shared/api";
import { PankovGameComponent } from '@gandogames/lib/games/pankov';
import { PokerGameComponent } from '@gandogames/lib/games/poker';

export interface GameComponent<TState extends GameState = GameState> {
	gameState: InputSignal<TState | null>;
	loading: InputSignal<boolean>;
	error: InputSignal<string | null>;
	myPlayFabId: InputSignal<string | null>;
	gameAction: OutputEmitterRef<{ action: string; data?: unknown }>;
	back: OutputEmitterRef<void>;
	playAgain: OutputEmitterRef<void>;
}

export interface GameDescriptor {
	id: GameType;
	name: string;
	icon: string;
	description: string;
	minPlayers: number;
	maxPlayers: number;
	component: Type<unknown>;
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
	},
	poker: {
		id: 'poker',
		name: 'Texas Hold\'em',
		icon: 'fa-solid fa-heart',
		description: 'Bet, bluff, and outlast everyone at the table.',
		minPlayers: 2,
		maxPlayers: 8,
		component: PokerGameComponent,
	},
};
