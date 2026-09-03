import { buildPlayer, type GamePlayer } from '@gandogames/shared/dto';
import type { RollValue } from '@gandogames/shared/pankov';
import { PankovGame } from './pankov';

const p1: GamePlayer = buildPlayer('p1', 'Alice');
const p2: GamePlayer = buildPlayer('p2', 'Bob');
const p3: GamePlayer = buildPlayer('p3', 'Charlie');

// Forces Math.random so Math.ceil(random*6) = d1 then d2, producing rollToValue(d1,d2).
function rollTo(game: PankovGame, player: GamePlayer, value: number): void {
	const high = Math.floor(value / 10);
	const low = value % 10;
	jest.spyOn(Math, 'random')
		.mockReturnValueOnce((high - 1) / 6 + 0.01)
		.mockReturnValueOnce((low - 1) / 6 + 0.01);
	game.action(player, 'roll', {});
	jest.restoreAllMocks();
}

describe('PankovGame', () => {
	let game: PankovGame;

	beforeEach(() => {
		game = new PankovGame('pankov');
		game.initialize([p1, p2]);
	});

	afterEach(() => jest.restoreAllMocks());

	describe('initialize', () => {
		it('starts in turn-start phase with player 0 as current', () => {
			const state = game.state!;
			expect(state.gamePhase).toBe('turn-start');
			expect(state.currentPlayerIndex).toBe(0);
			expect(state.previousTurn?.declaration).toBeFalsy();
		});

		it('assigns 8 lives to each player', () => {
			expect(game.state!.players.every(p => p.lives === 8)).toBe(true);
		});
	});

	describe('action: roll', () => {
		it('transitions to rolled and sets currentRoll to correct dice value', () => {
			rollTo(game, p1, 31); // d1=3, d2=1 → 31
			expect(game.state!.gamePhase).toBe('rolled');
			expect(game.state!.currentRoll).toBe(31);
		});

		it('is ignored for non-current player', () => {
			game.action(p2, 'roll', {});
			expect(game.state!.gamePhase).toBe('turn-start');
		});

		it('is ignored when not in turn-start phase', () => {
			rollTo(game, p1, 31);
			const roll = game.state!.currentRoll;
			rollTo(game, p1, 41); // already in 'rolled', ignored
			expect(game.state!.currentRoll).toBe(roll);
		});

		it('throws when game not initialized', () => {
			expect(() => new PankovGame('pankov').action(p1, 'roll', {})).toThrow('Game not initialized');
		});
	});

	describe('action: declare', () => {
		beforeEach(() => {
			rollTo(game, p1, 31); // rank 0
		});

		it('advances to next player and records previousTurn?.declaration', () => {
			game.action(p1, 'declare', { declaration: 32 as RollValue });
			expect(game.state!.gamePhase).toBe('turn-start');
			expect(game.state!.currentPlayerIndex).toBe(1);
			expect(game.state!.previousTurn?.declaration).toBe(32);
		});

		it('saves actual roll as previousActualRoll (hidden from others)', () => {
			game.action(p1, 'declare', { declaration: 32 as RollValue });
			expect(game.state!.previousTurn?.actualRoll).toBe(31); // internal state
		});

		it('is rejected when declaration rank is lower than previous', () => {
			game.action(p1, 'declare', { declaration: 65 as RollValue }); // rank 13
			rollTo(game, p2, 31);
			game.action(p2, 'declare', { declaration: 32 as RollValue }); // rank 1 < 13, rejected
			expect(game.state!.gamePhase).toBe('rolled');
			expect(game.state!.currentPlayerIndex).toBe(1); // still p2's turn
		});

		it('accepts declaration at equal rank', () => {
			game.action(p1, 'declare', { declaration: 32 as RollValue }); // rank 1
			rollTo(game, p2, 31);
			game.action(p2, 'declare', { declaration: 32 as RollValue }); // equal rank allowed
			expect(game.state!.gamePhase).toBe('turn-start');
		});

		it('is ignored when not in rolled phase', () => {
			game.action(p1, 'declare', { declaration: 31 as RollValue }); // back to turn-start
			game.action(p2, 'declare', { declaration: 32 as RollValue }); // ignored
			expect(game.state!.currentPlayerIndex).toBe(1); // still p2's turn
		});

		it('is ignored for invalid declaration value', () => {
			game.action(p1, 'declare', { declaration: 99 as RollValue });
			expect(game.state!.gamePhase).toBe('rolled');
		});
	});

	describe('action: challenge', () => {
		it('marks wasLying=true and loser=p1 when p1 bluffed Pankov on 31', () => {
			rollTo(game, p1, 31); // actual rank 0
			game.action(p1, 'declare', { declaration: 21 as RollValue }); // claims rank 20 (lie)
			game.action(p2, 'challenge', {});

			const result = game.state!.revealResult!;
			expect(result.wasLying).toBe(true);
			expect(result.loserIndex).toBe(0); // p1 is the liar
			expect(game.state!.players[0].lives).toBe(7);
			expect(game.state!.gamePhase).toBe('result');
		});

		it('marks wasLying=false and loser=p2 when p1 declared Pankov honestly', () => {
			rollTo(game, p1, 21); // actual = 21 (rank 20)
			game.action(p1, 'declare', { declaration: 21 as RollValue }); // honest
			game.action(p2, 'challenge', {});

			const result = game.state!.revealResult!;
			expect(result.wasLying).toBe(false);
			expect(result.loserIndex).toBe(1); // p2 (challenger)
			expect(game.state!.players[1].lives).toBe(7);
		});

		it('is ignored when there is no previous declaration', () => {
			game.action(p2, 'challenge', {});
			expect(game.state!.gamePhase).toBe('turn-start');
		});

		it('is ignored for non-current player', () => {
			rollTo(game, p1, 31);
			game.action(p1, 'declare', { declaration: 21 as RollValue });
			game.action(p1, 'challenge', {}); // p1 is not current player (p2 is)
			expect(game.state!.gamePhase).toBe('turn-start');
		});
	});

	describe('action: continue', () => {
		beforeEach(() => {
			rollTo(game, p1, 31);
			game.action(p1, 'declare', { declaration: 21 as RollValue }); // lie
			game.action(p2, 'challenge', {});  // p1 loses 1 life → 7
		});

		it('transitions to turn-start and clears result', () => {
			game.action(p1, 'continue', {});
			expect(game.state!.gamePhase).toBe('turn-start');
			expect(game.state!.revealResult).toBeUndefined();
		});

		it('resets previous declaration fields', () => {
			game.action(p1, 'continue', {});
			expect(game.state!.previousTurn?.declaration).toBeFalsy();
			expect(game.state!.previousTurn?.playerIndex).toBeFalsy();
			expect(game.state!.previousTurn?.actualRoll).toBeFalsy();
		});

		it('transitions to game-over when loser reaches 0 lives', () => {
			game.state!.players[0].lives = 0;
			game.action(p1, 'continue', {});
			expect(game.state!.gamePhase).toBe('game-over');
			expect(game.state!.winnerName).toBe('Bob');
		});

		it('is ignored when not in result phase', () => {
			game.action(p1, 'continue', {}); // ok → turn-start
			game.action(p1, 'continue', {}); // ignored
			expect(game.state!.gamePhase).toBe('turn-start');
		});
	});

	describe('getPublicState', () => {
		it('hides currentRoll for non-current player', () => {
			rollTo(game, p1, 31);
			expect(game.getPublicState('p2').currentRoll).toBeNull();
		});

		it('shows currentRoll for the current player', () => {
			rollTo(game, p1, 31);
			expect(game.getPublicState('p1').currentRoll).toBe(31);
		});

		it('always nullifies previousActualRoll in public state', () => {
			rollTo(game, p1, 31);
			game.action(p1, 'declare', { declaration: 31 as RollValue });
			expect(game.getPublicState('p1').previousTurn?.actualRoll).toBeFalsy();
			expect(game.getPublicState('p2').previousTurn?.actualRoll).toBeFalsy();
		});

		it('throws when game not initialized', () => {
			expect(() => new PankovGame('pankov').getPublicState('p1')).toThrow('Game not initialized');
		});
	});

	describe('nextAliveIndex (via declare with dead player)', () => {
		it('skips dead players when advancing turn', () => {
			game.initialize([p1, p2, p3]);
			game.state!.players[1].lives = 0; // p2 is eliminated
			rollTo(game, p1, 31);
			game.action(p1, 'declare', { declaration: 31 as RollValue });
			expect(game.state!.currentPlayerIndex).toBe(2); // skipped p2, landed on p3
		});
	});

	describe('settings & sudden death', () => {
		it('seeds a custom initial lives count', () => {
			game.initialize([p1, p2], { initialLives: 3 });
			expect(game.state!.players.every(p => p.lives === 3)).toBe(true);
		});

		it('doubles the lives a wrong challenger loses during a Pankov run', () => {
			game.initialize([p1, p2], { suddenDeath: true, initialLives: 8 });
			rollTo(game, p1, 31);
			game.action(p1, 'declare', { declaration: 21 as RollValue }); // Pankov run, streak 1
			rollTo(game, p2, 21);
			game.action(p2, 'declare', { declaration: 21 as RollValue }); // honest Pankov, streak 2
			game.action(p1, 'challenge', {});                             // p1 wrongly challenges

			const r = game.state!.revealResult!;
			expect(r.wasLying).toBe(false);
			expect(r.loserIndex).toBe(0);   // p1, the challenger
			expect(r.livesLost).toBe(2);    // 2^(streak-1) = 2^1
			expect(game.state!.players[0].lives).toBe(6);
		});

		it('keeps doubling along a longer Pankov run (streak 3 → 4 lives)', () => {
			game.initialize([p1, p2], { suddenDeath: true, initialLives: 8 });
			rollTo(game, p1, 31);
			game.action(p1, 'declare', { declaration: 21 as RollValue }); // streak 1
			rollTo(game, p2, 21);
			game.action(p2, 'declare', { declaration: 21 as RollValue }); // streak 2
			rollTo(game, p1, 21);
			game.action(p1, 'declare', { declaration: 21 as RollValue }); // streak 3 (honest)
			game.action(p2, 'challenge', {});                             // p2 wrongly challenges

			expect(game.state!.revealResult!.livesLost).toBe(4); // 2^(3-1)
			expect(game.state!.players[1].lives).toBe(4);
		});

		it('still costs a caught liar only one life under sudden death', () => {
			game.initialize([p1, p2], { suddenDeath: true });
			rollTo(game, p1, 31);
			game.action(p1, 'declare', { declaration: 21 as RollValue });
			rollTo(game, p2, 31);                                         // p2 rolls 31 …
			game.action(p2, 'declare', { declaration: 21 as RollValue }); // … but lies "Pankov"
			game.action(p1, 'challenge', {});                             // catches the lie

			const r = game.state!.revealResult!;
			expect(r.wasLying).toBe(true);
			expect(r.loserIndex).toBe(1); // p2, the liar
			expect(r.livesLost).toBe(1);  // doubling never applies to a caught liar
			expect(game.state!.players[1].lives).toBe(7);
		});

		it('does not double a wrong challenge when sudden death is off', () => {
			game.initialize([p1, p2], { suddenDeath: false });
			rollTo(game, p1, 31);
			game.action(p1, 'declare', { declaration: 21 as RollValue });
			rollTo(game, p2, 21);
			game.action(p2, 'declare', { declaration: 21 as RollValue });
			game.action(p1, 'challenge', {});

			expect(game.state!.revealResult!.livesLost).toBe(1);
			expect(game.state!.players[0].lives).toBe(7);
		});

		it('resets the Pankov streak after a round ends', () => {
			game.initialize([p1, p2], { suddenDeath: true, initialLives: 8 });
			rollTo(game, p1, 31);
			game.action(p1, 'declare', { declaration: 21 as RollValue }); // streak 1
			rollTo(game, p2, 21);
			game.action(p2, 'declare', { declaration: 21 as RollValue }); // streak 2
			game.action(p1, 'challenge', {});
			game.action(p1, 'continue', {});
			expect(game.state!.pankovStreak).toBe(0);
		});
	});

});
