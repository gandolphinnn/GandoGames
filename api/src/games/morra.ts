import { GamePlayer, GameState, GameType } from '@gandogames/common/api';
import { Hand, MorraState } from '@gandogames/common/morra';
import { Game } from './game';

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

	public action(player: GamePlayer, action: string, data: any): MorraState {
		return {} as MorraState
	}
}