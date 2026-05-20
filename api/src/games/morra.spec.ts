import { MorraGame } from './morra';
import type { GamePlayer } from '@gandogames/common/api';

const p1: GamePlayer = { id: 'p1', name: 'Alice' };
const p2: GamePlayer = { id: 'p2', name: 'Bob' };

describe('MorraGame', () => {
	let game: MorraGame;

	beforeEach(() => {
		game = new MorraGame();
		game.initialize([p1, p2]);
	});

	describe('initialize', () => {
		it('starts in picking phase with 3 lives each', () => {
			const state = game.state!;
			expect(state.gamePhase).toBe('picking');
			expect(state.players[0].lives).toBe(3);
			expect(state.players[1].lives).toBe(3);
			expect(state.players.every(p => !p.hasPicked)).toBe(true);
		});
	});

	describe('getPublicState', () => {
		it('hides opponent pick but shows hasPicked, reveals own pick', () => {
			game.action(p1, 'pick', { hand: 'rock' });
			const forP2 = game.getPublicState('p2');
			expect(forP2.players.find(p => p.id === 'p1')!.currentPick).toBeUndefined();
			expect(forP2.players.find(p => p.id === 'p1')!.hasPicked).toBe(true);

			const forP1 = game.getPublicState('p1');
			expect(forP1.players.find(p => p.id === 'p1')!.currentPick).toBe('rock');
		});

		it('throws when not initialized', () => {
			expect(() => new MorraGame().getPublicState('p1')).toThrow('Game not initialized');
		});
	});

	describe('action: pick', () => {
		it('transitions to reveal when both players pick', () => {
			game.action(p1, 'pick', { hand: 'rock' });
			expect(game.state!.gamePhase).toBe('picking');
			game.action(p2, 'pick', { hand: 'scissors' });
			expect(game.state!.gamePhase).toBe('reveal');
		});

		it('ignores duplicate pick from same player', () => {
			game.action(p1, 'pick', { hand: 'rock' });
			game.action(p1, 'pick', { hand: 'paper' });
			expect(game.state!.players.find(p => p.id === 'p1')!.currentPick).toBe('rock');
		});

		it('ignores invalid hand value', () => {
			game.action(p1, 'pick', { hand: 'dynamite' });
			expect(game.state!.players.find(p => p.id === 'p1')!.hasPicked).toBe(false);
		});

		it('is ignored when not in picking phase', () => {
			game.action(p1, 'pick', { hand: 'rock' });
			game.action(p2, 'pick', { hand: 'scissors' }); // transitions to reveal
			game.action(p1, 'pick', { hand: 'paper' });    // should be ignored
			expect(game.state!.gamePhase).toBe('reveal');
		});

		it('throws when game not initialized', () => {
			expect(() => new MorraGame().action(p1, 'pick', { hand: 'rock' })).toThrow('Game not initialized');
		});
	});

	describe('result computation', () => {
		it('rock beats scissors — scissors player loses', () => {
			game.action(p1, 'pick', { hand: 'rock' });
			game.action(p2, 'pick', { hand: 'scissors' });
			expect(game.state!.result!.losers).toContain('p2');
			expect(game.state!.result!.isDraw).toBe(false);
		});

		it('scissors beats paper — paper player loses', () => {
			game.action(p1, 'pick', { hand: 'scissors' });
			game.action(p2, 'pick', { hand: 'paper' });
			expect(game.state!.result!.losers).toContain('p2');
		});

		it('paper beats rock — rock player loses', () => {
			game.action(p1, 'pick', { hand: 'paper' });
			game.action(p2, 'pick', { hand: 'rock' });
			expect(game.state!.result!.losers).toContain('p2');
		});

		it('same hand is a draw with no losers', () => {
			game.action(p1, 'pick', { hand: 'rock' });
			game.action(p2, 'pick', { hand: 'rock' });
			expect(game.state!.result!.isDraw).toBe(true);
			expect(game.state!.result!.losers).toHaveLength(0);
		});

		it('records both players\' picks in result', () => {
			game.action(p1, 'pick', { hand: 'rock' });
			game.action(p2, 'pick', { hand: 'scissors' });
			const picks = game.state!.result!.picks;
			expect(picks['p1']).toBe('rock');
			expect(picks['p2']).toBe('scissors');
		});
	});

	describe('action: next-round', () => {
		beforeEach(() => {
			game.action(p1, 'pick', { hand: 'rock' });
			game.action(p2, 'pick', { hand: 'scissors' }); // p2 loses
		});

		it('deducts one life from the loser only', () => {
			game.action(p1, 'next-round', {});
			expect(game.state!.players.find(p => p.id === 'p2')!.lives).toBe(2);
			expect(game.state!.players.find(p => p.id === 'p1')!.lives).toBe(3);
		});

		it('resets to picking phase with all picks cleared', () => {
			game.action(p1, 'next-round', {});
			expect(game.state!.gamePhase).toBe('picking');
			expect(game.state!.players.every(p => !p.hasPicked)).toBe(true);
			expect(game.state!.players.every(p => p.currentPick === undefined)).toBe(true);
		});

		it('is ignored when not in reveal phase', () => {
			game.action(p1, 'next-round', {}); // now picking
			game.action(p1, 'next-round', {}); // ignored in picking
			expect(game.state!.gamePhase).toBe('picking');
		});

		it('draw does not deduct lives', () => {
			game.initialize([p1, p2]);
			game.action(p1, 'pick', { hand: 'paper' });
			game.action(p2, 'pick', { hand: 'paper' });
			game.action(p1, 'next-round', {});
			expect(game.state!.players.find(p => p.id === 'p1')!.lives).toBe(3);
			expect(game.state!.players.find(p => p.id === 'p2')!.lives).toBe(3);
		});
	});

	describe('game over', () => {
		it('ends when a player runs out of lives, names the winner', () => {
			for (let i = 0; i < 3; i++) {
				game.action(p1, 'pick', { hand: 'rock' });
				game.action(p2, 'pick', { hand: 'scissors' });
				game.action(p1, 'next-round', {});
			}
			expect(game.state!.gamePhase).toBe('game-over');
			expect(game.state!.winnerName).toBe('Alice');
		});
	});

	describe('describe', () => {
		it('returns picking message in picking phase', () => {
			expect(game.describe(game.state!)).toBe('Round started — choose your hand');
		});

		it('returns draw message in reveal phase when drawn', () => {
			game.action(p1, 'pick', { hand: 'scissors' });
			game.action(p2, 'pick', { hand: 'scissors' });
			expect(game.describe(game.state!)).toBe('Draw — no lives lost');
		});

		it('includes pick labels and loser marker in reveal phase', () => {
			game.action(p1, 'pick', { hand: 'rock' });
			game.action(p2, 'pick', { hand: 'scissors' });
			const msg = game.describe(game.state!);
			expect(msg).toContain('Rock');
			expect(msg).toContain('Scissors');
			expect(msg).toContain('−1');
		});

		it('returns winner name in game-over phase', () => {
			for (let i = 0; i < 3; i++) {
				game.action(p1, 'pick', { hand: 'rock' });
				game.action(p2, 'pick', { hand: 'scissors' });
				game.action(p1, 'next-round', {});
			}
			const msg = game.describe(game.state!);
			expect(msg).toContain('Alice');
			expect(msg).toContain('wins');
		});
	});

	it('ignores unknown action without changing phase', () => {
		const phase = game.state!.gamePhase;
		game.action(p1, 'fly', {});
		expect(game.state!.gamePhase).toBe(phase);
	});
});
