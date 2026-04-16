import { Game, GamePlayer, GameState } from './game'

export type Hand = 'rock' | 'paper' | 'scissors';

export const HANDS: Hand[] = ['rock', 'paper', 'scissors'];

/** Maps each hand to the hand it beats. */
export const BEATS: Record<Hand, Hand> = {
	rock: 'scissors',
	scissors: 'paper',
	paper: 'rock',
};

export const HAND_LABEL: Record<Hand, string> = {
	rock: 'Rock',
	paper: 'Paper',
	scissors: 'Scissors',
};

export interface MorraPlayer extends GamePlayer {
	currentPick?: Hand,
	lives: number,
}

export interface MorraState extends GameState {
	players: [MorraPlayer, MorraPlayer],
}

export class MorraGame extends Game<MorraState> {
	public override minPlayers: number = 2;
	public override maxPlayers: number = 2;

	public override getPublicState(playerId: string): MorraState {
		const selfPlayer = this.state?.players.find(p => p.id == playerId);
		const otherPlayer = { ...this.state?.players.find(p => p.id != playerId) };
		delete otherPlayer?.currentPick;
		return {
			lastUpdate: this.state?.lastUpdate,
			players: [ selfPlayer, otherPlayer]
		} as MorraState;
	}

	public action(playerId: string) {

	}
}