import type { GamePlayer } from '@gandogames/common/api';
import type { Hand, MorraGameState, MorraPlayer, MorraRoundResult } from '@gandogames/common/morra';
import { Game } from './game';

const HAND_LABEL: Record<Hand, string> = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };

const HANDS: Hand[] = ['rock', 'paper', 'scissors'];

const BEATS: Record<Hand, Hand> = {
	rock: 'scissors',
	scissors: 'paper',
	paper: 'rock',
};

const INITIAL_LIVES = 3;

export class MorraGame extends Game<MorraGameState> {
	public override minPlayers = 2;
	public override maxPlayers = 2;

	public override initialize(players: GamePlayer[]): void {
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'picking',
			players: players.map(p => ({
				id: p.id,
				name: p.name,
				lives: INITIAL_LIVES,
				hasPicked: false,
			})),
		};
	}

	public override getPublicState(playerId: string): MorraGameState {
		if (!this.state) throw new Error('Game not initialized');
		const players = this.state.players.map(p => {
			if (p.id === playerId) return p;
			const { currentPick: _omit, ...rest } = p;
			return rest as MorraPlayer;
		});
		return { ...this.state, players };
	}

	public override describe(state: MorraGameState): string {
		switch (state.gamePhase) {
			case 'picking':
				return 'Round started — choose your hand';
			case 'reveal': {
				if (!state.result) return 'Reveal';
				if (state.result.isDraw) return 'Draw — no lives lost';
				const parts = state.players.map(p => {
					const hand = HAND_LABEL[state.result!.picks[p.id] as Hand] ?? state.result!.picks[p.id];
					const lost = state.result!.losers.includes(p.id);
					return `${p.name}: ${hand}${lost ? ' (−1)' : ''}`;
				});
				return parts.join(' · ');
			}
			case 'game-over':
				return `Game over — ${state.winnerName ?? '?'} wins!`;
		}
	}

	public override action(player: GamePlayer, action: string, data: any): MorraGameState {
		if (!this.state) throw new Error('Game not initialized');

		if (action === 'pick') {
			return this.applyPick(player.id, data.hand as Hand);
		}
		if (action === 'next-round') {
			return this.applyNextRound();
		}

		return this.state;
	}

	private applyPick(playerId: string, hand: Hand): MorraGameState {
		const state = this.state!;
		if (state.gamePhase !== 'picking') return state;
		if (!HANDS.includes(hand)) return state;

		const player = state.players.find(p => p.id === playerId);
		if (!player || player.lives === 0 || player.hasPicked) return state;

		player.currentPick = hand;
		player.hasPicked = true;

		const alivePlayers = state.players.filter(p => p.lives > 0);
		if (alivePlayers.every(p => p.hasPicked)) {
			state.result = this.computeResult(alivePlayers);
			state.gamePhase = 'reveal';
		}

		state.lastUpdate = new Date();
		return state;
	}

	private applyNextRound(): MorraGameState {
		const state = this.state!;
		if (state.gamePhase !== 'reveal' || !state.result) return state;

		for (const loserId of state.result.losers) {
			const p = state.players.find(p => p.id === loserId);
			if (p) p.lives = Math.max(0, p.lives - 1);
		}

		const alive = state.players.filter(p => p.lives > 0);
		if (alive.length <= 1) {
			state.gamePhase = 'game-over';
			state.winnerName = alive[0]?.name;
		} else {
			state.gamePhase = 'picking';
			state.result = undefined;
			for (const p of state.players) {
				p.hasPicked = false;
				p.currentPick = undefined;
			}
		}

		state.lastUpdate = new Date();
		return state;
	}

	private computeResult(alivePlayers: MorraPlayer[]): MorraRoundResult {
		const picks: Record<string, Hand> = {};
		for (const p of alivePlayers) {
			if (p.currentPick) picks[p.id] = p.currentPick;
		}

		const uniqueHands = [...new Set(Object.values(picks))] as Hand[];

		if (uniqueHands.length !== 2) {
			return { picks, losers: [], isDraw: true };
		}

		const [h1, h2] = uniqueHands;
		const losingHand = BEATS[h1] === h2 ? h2 : h1;
		const losers = alivePlayers
			.filter(p => p.currentPick === losingHand)
			.map(p => p.id);

		return { picks, losers, isDraw: false };
	}
}
