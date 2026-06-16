import type { GamePlayer } from '@gandogames/shared/api';
import { type PankovGameState, type RollValue, INITIAL_LIVES, ROLL_VALUES, getRank, rollToValue } from '@gandogames/shared/pankov';
import { Game } from './game';

export class PankovGame extends Game<PankovGameState> {
	public override minPlayers = 2;
	public override maxPlayers = 6;

	public override initialize(players: GamePlayer[]): void {
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'turn-start',
			players: players.map(p => ({ ...p, lives: INITIAL_LIVES })),
			currentPlayerIndex: 0,
			previousPlayerIndex: null,
			previousDeclaration: null,
			previousActualRoll: null,
			currentRoll: null,
		};
	}

	public override getPublicState(playerId: string): PankovGameState {
		if (!this.state) throw new Error('Game not initialized');
		const currentPlayer = this.state.players[this.state.currentPlayerIndex];
		return {
			...this.state,
			currentRoll: currentPlayer?.id === playerId ? this.state.currentRoll : null,
			previousActualRoll: null,
		};
	}

	public override action(player: GamePlayer, action: string, data: any): PankovGameState {
		if (!this.state) throw new Error('Game not initialized');
		if (action === 'roll') return this.applyRoll(player.id);
		if (action === 'declare') return this.applyDeclare(player.id, data?.declaration as RollValue);
		if (action === 'challenge') return this.applyChallenge(player.id);
		if (action === 'continue') return this.applyContinue();
		return this.state;
	}

	private applyRoll(playerId: string): PankovGameState {
		const state = this.state!;
		if (state.gamePhase !== 'turn-start') return state;
		const current = state.players[state.currentPlayerIndex];
		if (!current || current.id !== playerId) return state;

		const d1 = Math.ceil(Math.random() * 6);
		const d2 = Math.ceil(Math.random() * 6);
		state.currentRoll = rollToValue(d1, d2);
		state.gamePhase = 'rolled';
		state.lastUpdate = new Date();
		return state;
	}

	private applyDeclare(playerId: string, declaration: RollValue): PankovGameState {
		const state = this.state!;
		if (state.gamePhase !== 'rolled') return state;
		const current = state.players[state.currentPlayerIndex];
		if (!current || current.id !== playerId) return state;
		if (!(ROLL_VALUES as readonly number[]).includes(declaration)) return state;
		if (state.previousDeclaration !== null && getRank(declaration) < getRank(state.previousDeclaration)) return state;

		state.previousActualRoll = state.currentRoll;
		state.previousPlayerIndex = state.currentPlayerIndex;
		state.previousDeclaration = declaration;
		state.currentRoll = null;
		state.currentPlayerIndex = this.nextAliveIndex(state.currentPlayerIndex);
		state.gamePhase = 'turn-start';
		state.lastUpdate = new Date();
		return state;
	}

	private applyChallenge(playerId: string): PankovGameState {
		const state = this.state!;
		if (state.gamePhase !== 'turn-start') return state;
		if (state.previousDeclaration === null || state.previousPlayerIndex === null || state.previousActualRoll === null) return state;
		const current = state.players[state.currentPlayerIndex];
		if (!current || current.id !== playerId) return state;

		const wasLying = getRank(state.previousDeclaration) > getRank(state.previousActualRoll);
		const loserIndex = wasLying ? state.previousPlayerIndex : state.currentPlayerIndex;
		state.players[loserIndex].lives = Math.max(0, state.players[loserIndex].lives - 1);
		state.revealResult = {
			declared: state.previousDeclaration,
			actual: state.previousActualRoll,
			wasLying,
			loserIndex,
		};
		state.gamePhase = 'result';
		state.lastUpdate = new Date();
		return state;
	}

	private applyContinue(): PankovGameState {
		const state = this.state!;
		if (state.gamePhase !== 'result') return state;

		const alive = state.players.filter(p => p.lives > 0);
		if (alive.length <= 1) {
			state.gamePhase = 'game-over';
			state.winnerName = alive[0]?.name;
		} else {
			const loserIndex = state.revealResult!.loserIndex;
			const loser = state.players[loserIndex];
			state.currentPlayerIndex = loser.lives > 0 ? loserIndex : this.nextAliveIndex(loserIndex);
			state.previousPlayerIndex = null;
			state.previousDeclaration = null;
			state.previousActualRoll = null;
			state.currentRoll = null;
			state.revealResult = undefined;
			state.gamePhase = 'turn-start';
		}

		state.lastUpdate = new Date();
		return state;
	}

	private nextAliveIndex(fromIndex: number): number {
		const state = this.state!;
		const n = state.players.length;
		let idx = (fromIndex + 1) % n;
		while (idx !== fromIndex && state.players[idx].lives === 0) {
			idx = (idx + 1) % n;
		}
		return idx;
	}
}
