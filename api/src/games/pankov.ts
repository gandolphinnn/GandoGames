import type { GamePlayer, GameSettings } from '@gandogames/shared/dto';
import { type PankovGameState, type RollValue, PANKOV_VALUE, ROLL_VALUES, getRank, resolvePankovSettings, rollToValue } from '@gandogames/shared/pankov';
import { Game } from './game';

export class PankovGame extends Game<PankovGameState> {
	public override minPlayers = 2;
	public override maxPlayers = 6;

	public override initialize(players: GamePlayer[], settings?: GameSettings): void {
		const resolved = resolvePankovSettings(settings);
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'turn-start',
			players: players.map(p => ({ ...p, lives: resolved.initialLives })),
			currentPlayerIndex: 0,
			previousPlayerIndex: null,
			previousDeclaration: null,
			previousActualRoll: null,
			currentRoll: null,
			settings: resolved,
			pankovStreak: 0,
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
		// Track the run of consecutive Pankov declarations that drives sudden-death stakes; any
		// lower declaration breaks it. (Once Pankov is declared, only Pankov can legally follow.)
		state.pankovStreak = declaration === PANKOV_VALUE ? state.pankovStreak + 1 : 0;
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
		// Sudden death: a wrong challenge during a Pankov run costs double for each consecutive
		// Pankov (1, 2, 4, …). Only the losing *challenger* pays it — a caught liar still loses one.
		let livesLost = 1;
		if (state.settings.suddenDeath && !wasLying && state.previousDeclaration === PANKOV_VALUE) {
			livesLost = Math.pow(2, state.pankovStreak - 1);
		}
		state.players[loserIndex].lives = Math.max(0, state.players[loserIndex].lives - livesLost);
		state.revealResult = {
			declared: state.previousDeclaration,
			actual: state.previousActualRoll,
			wasLying,
			loserIndex,
			livesLost,
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
			state.pankovStreak = 0;
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
