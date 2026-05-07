import type { GamePlayer } from '@gandogames/common/api';
import type { PankovGameState, RollValue } from '@gandogames/common/pankov';
import { Game } from './game';

function formatValue(value: RollValue): string {
	if (value === 21) return 'Pankov!';
	const high = Math.floor(value / 10);
	const low = value % 10;
	if (high === low) return `Pair of ${high}s`;
	return `${high}-${low}`;
}

const INITIAL_LIVES = 8;

const ROLL_VALUES = [
	31, 32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65,
	11, 22, 33, 44, 55, 66,
	21,
] as const;

const RANK_MAP = new Map<number, number>(ROLL_VALUES.map((v, i) => [v, i]));

function getRank(value: number): number {
	return RANK_MAP.get(value) ?? -1;
}

function rollToValue(d1: number, d2: number): RollValue {
	const high = Math.max(d1, d2);
	const low = Math.min(d1, d2);
	return (high * 10 + low) as RollValue;
}

export class PankovGame extends Game<PankovGameState> {
	public override minPlayers = 2;
	public override maxPlayers = 6;

	public override initialize(players: GamePlayer[]): void {
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'turn-start',
			players: players.map(p => ({ id: p.id, name: p.name, lives: INITIAL_LIVES })),
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

	public override describe(state: PankovGameState): string {
		const current = state.players[state.currentPlayerIndex];
		switch (state.gamePhase) {
			case 'turn-start':
				return state.previousDeclaration != null
					? `${current?.name ?? '?'}'s turn — last claim: ${formatValue(state.previousDeclaration)}`
					: `${current?.name ?? '?'} goes first`;
			case 'rolled':
				return `${current?.name ?? '?'} rolled, choosing a declaration…`;
			case 'result': {
				if (!state.revealResult) return 'Round result';
				const loser = state.players[state.revealResult.loserIndex];
				const claimed = formatValue(state.revealResult.declared);
				const actual = formatValue(state.revealResult.actual);
				return state.revealResult.wasLying
					? `Liar! Claimed ${claimed}, got ${actual} — ${loser?.name ?? '?'} −1 life`
					: `Honest! Claimed ${claimed}, got ${actual} — challenger ${loser?.name ?? '?'} −1 life`;
			}
			case 'game-over':
				return `Game over — ${state.winnerName ?? '?'} wins!`;
		}
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
