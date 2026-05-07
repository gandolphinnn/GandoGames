import { InputSignal, OutputEmitterRef } from "@angular/core";
import { GameState, GameType } from "@gandogames/common/api";
import { describeMorraState } from "@gandogames/lib/games/morra";
import { describePankovState } from "@gandogames/lib/games/pankov";
import type { MorraGameState } from "@gandogames/common/morra";
import type { PankovGameState } from "@gandogames/common/pankov";

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
	describeState: (state: GameState) => string;
}

export const GAME_REGISTRY: GameDescriptor[] = [
	{
		id: 'morra',
		name: 'Morra',
		icon: 'fa-solid fa-hand-fist',
		description: 'Classic rock paper scissors — pick your hand and outlast your opponent.',
		minPlayers: 2,
		maxPlayers: 2,
		describeState: s => describeMorraState(s as MorraGameState),
	},
	{
		id: 'pankov',
		name: 'Pankov',
		icon: 'fa-solid fa-dice',
		description: 'Roll two dice and bluff your way to victory. Call out liars or lose a life.',
		minPlayers: 2,
		maxPlayers: 6,
		describeState: s => describePankovState(s as PankovGameState),
	},
];
