import type { GamePlayer, GameSettings } from '@gandogames/shared/dto';
import { type MastermindGameState, MastermindGuess, MastermindScore, resolveMastermindSettings } from '@gandogames/shared/mastermind';
import { Game } from './game';

export class MastermindGame extends Game<MastermindGameState> {
	constructor() {super('mastermind')}
	public override initialize(players: GamePlayer[], settings?: GameSettings): void {
		throw new Error('Not implemented');
		const resolved = resolveMastermindSettings(settings);
		this.state = {
			lastUpdate: new Date(),
			players: players,
			currentPlayerIndex: 0,
			settings: resolved,
			turns: [],
		} as MastermindGameState;

		this.botAction();
	}

	public override getPublicState(playerId: string): MastermindGameState {
		if (!this.state) throw new Error('Game not initialized');
		return this.state;
	}

	public override action(player: GamePlayer, action: string, data: any): MastermindGameState {
		if (!this.state) throw new Error('Game not initialized');
		if (action === 'guess') return this.guess(player.id, data);
		return this.state;
	}

	private guess(playerId: string, guess: MastermindGuess): MastermindGameState {
		const state = this.state!;
		const score: MastermindScore = 0;
		state.turns.push({
			guess: guess,
			score: score,
		})
		return state;
	}

	public botAction(): MastermindGameState {
		throw new Error('Not implemented');
	}
}