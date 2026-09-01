import type { GamePlayer, GameSettings } from '@gandogames/shared/dto';
import { type PankovGameState, type RollValue, PANKOV_VALUE, ROLL_VALUES, getRank, getValidDeclarations, resolvePankovSettings, rollPankovDices } from '@gandogames/shared/pankov';
import { Game } from './game';
import { PankovBot } from './bots/pankov';

export class PankovGame extends Game<PankovGameState> {
	public override initialize(players: GamePlayer[], settings?: GameSettings): void {
		const resolved = resolvePankovSettings(settings);
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'turn-start',
			players: players.map(p => ({ ...p, lives: resolved.initialLives })),
			currentPlayerIndex: 0,
			previousTurn: null,
			currentRoll: null,
			settings: resolved,
			pankovStreak: 0,
		} as PankovGameState;
	}

	public override getPublicState(playerId: string): PankovGameState {
		if (!this.state) throw new Error('Game not initialized');
		const currentPlayer = this.state.players[this.state.currentPlayerIndex];
		const state: PankovGameState = {
			...this.state,
			currentRoll: currentPlayer?.id === playerId ? this.state.currentRoll : null,
		};
		if (state.previousTurn) state.previousTurn.actualRoll = null;
		return state;
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

		state.currentRoll = rollPankovDices();
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
		if (state.previousTurn !== null && getRank(declaration) < getRank(state.previousTurn.declaration)) return state;

		state.previousTurn = {
			playerIndex: state.currentPlayerIndex,
			declaration: declaration,
			actualRoll: state.currentRoll,
			beatedRoll: state.previousTurn?.declaration || null,
		};
		// Track the run of consecutive Pankov declarations that drives sudden-death stakes; any
		// lower declaration breaks it. (Once Pankov is declared, only Pankov can legally follow.)
		state.pankovStreak = declaration === PANKOV_VALUE ? state.pankovStreak + 1 : 0;
		state.currentRoll = null;
		state.currentPlayerIndex = this.nextAliveIndex(state.currentPlayerIndex);
		state.gamePhase = 'turn-start';
		state.lastUpdate = new Date();

		if (state.players[state.currentPlayerIndex].type === 'bot')
			return this.performBotAction();

		return state;
	}

	private applyChallenge(playerId: string): PankovGameState {
		const state = this.state!;
		if (state.gamePhase !== 'turn-start') return state;
		if (state.previousTurn === null) return state;
		const current = state.players[state.currentPlayerIndex];
		if (!current || current.id !== playerId) return state;

		const wasLying = getRank(state.previousTurn.declaration) !== getRank(state.previousTurn!.actualRoll!);
		const loserIndex = wasLying ? state.previousTurn.playerIndex : state.currentPlayerIndex;
		// Sudden death: a wrong challenge during a Pankov run costs double for each consecutive
		// Pankov (1, 2, 4, …). Only the losing *challenger* pays it — a caught liar still loses one.
		let livesLost = 1;
		if (state.settings.suddenDeath && !wasLying && state.previousTurn.declaration === PANKOV_VALUE) {
			livesLost = Math.pow(2, state.pankovStreak - 1);
		}
		state.players[loserIndex].lives = Math.max(0, state.players[loserIndex].lives - livesLost);
		state.revealResult = {
			declared: state.previousTurn.declaration,
			actual: state.previousTurn.actualRoll!,
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
			state.previousTurn = null;
			state.currentRoll = null;
			state.pankovStreak = 0;
			state.revealResult = undefined;
			state.gamePhase = 'turn-start';
		}

		if (state.players[state.currentPlayerIndex].type === 'bot')
			return this.performBotAction();

		state.lastUpdate = new Date();
		return state;
	}

	private nextAliveIndex(fromIndex: number): number {
		const state = this.state!;
		const numOfPlayers = state.players.length;
		let idx = (fromIndex + 1) % numOfPlayers;
		while (idx !== fromIndex && state.players[idx].lives === 0) {
			idx = (idx + 1) % numOfPlayers;
		}
		return idx;
	}

	// Returns the game state after performing the bot's action
	private performBotAction(): PankovGameState {
		const state = this.state!;
		const bot = new PankovBot(state.players[state.currentPlayerIndex].id);
		if (state.previousTurn !== null && bot.isChallenging(state.previousTurn) )
			return this.applyChallenge(bot.playerId);

		const roll = this.applyRoll(bot.playerId).currentRoll!;
		const validDeclarations = getValidDeclarations(state.previousTurn?.declaration || null);
		const mustLie = !validDeclarations.includes(roll);
		if (mustLie) {
			const lie = bot.lie(roll, validDeclarations);
			return this.applyDeclare(bot.playerId, lie);
		}

		const declaredRoll = bot.decideDeclaration(roll, validDeclarations);
		return this.applyDeclare(bot.playerId, declaredRoll);
	}
}