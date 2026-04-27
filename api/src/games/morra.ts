import { GamePlayer } from '@gandogames/common/api';
import { Hand, MorraGameState } from '@gandogames/common/morra';
import { Game } from './game';

export const HANDS: Hand[] = ['rock', 'paper', 'scissors'];

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

export class MorraGame extends Game<MorraGameState> {
	public override minPlayers: number = 2;
	public override maxPlayers: number = 2;

	public constructor() {
		super();
		//TODO set the initial state
	}

	public override getPublicState(playerId: string): MorraGameState {
		const selfPlayer = this.state?.players.find(p => p.id == playerId);
		const otherPlayer = { ...this.state?.players.find(p => p.id != playerId) };
		delete otherPlayer?.currentPick;
		return {
			...this.state,
			players: [selfPlayer, otherPlayer]
		} as MorraGameState;
	}

	public action(player: GamePlayer, action: string, data: any): MorraGameState {
		return {} as MorraGameState;
	}
}
