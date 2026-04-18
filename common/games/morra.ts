import { GamePlayer, GameState } from ".."

export type Hand = 'rock' | 'paper' | 'scissors';

export interface MorraPlayer extends GamePlayer {
	currentPick?: Hand,
	lives: number,
}

export interface MorraState extends GameState {
	players: [MorraPlayer, MorraPlayer],
}