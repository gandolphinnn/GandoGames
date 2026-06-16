import type { GamePlayer } from '@gandogames/shared/dto';
import type { RollValue } from '@gandogames/shared/pankov';
import { PankovGame } from './pankov';

const p1: GamePlayer = { id: 'p1', name: 'Alice', isGuest: false, icon: 'profile', theme: 'dark', language: 'en' };
const p2: GamePlayer = { id: 'p2', name: 'Bob', isGuest: false, icon: 'profile', theme: 'dark', language: 'en' };
const p3: GamePlayer = { id: 'p3', name: 'Charlie', isGuest: false, icon: 'profile', theme: 'dark', language: 'en' };

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
		game = new PankovGame();
		game.initialize([p1, p2]);
	});

	afterEach(() => jest.restoreAllMocks());

	describe('initialize', () => {
		it('starts in turn-start phase with player 0 as current', () => {
			const state = game.state!;
			expect(state.gamePhase).toBe('turn-start');
			expect(state.currentPlayerIndex).toBe(0);
			expect(state.previousDeclaration).toBeNull();
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
			expect(() => new PankovGame().action(p1, 'roll', {})).toThrow('Game not initialized');
		});
	});

	describe('action: declare', () => {
		beforeEach(() => {
			rollTo(game, p1, 31); // rank 0
		});

		it('advances to next player and records previousDeclaration', () => {
			game.action(p1, 'declare', { declaration: 32 as RollValue });
			expect(game.state!.gamePhase).toBe('turn-start');
			expect(game.state!.currentPlayerIndex).toBe(1);
			expect(game.state!.previousDeclaration).toBe(32);
		});

		it('saves actual roll as previousActualRoll (hidden from others)', () => {
			game.action(p1, 'declare', { declaration: 32 as RollValue });
			expect(game.state!.previousActualRoll).toBe(31); // internal state
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
			expect(game.state!.previousDeclaration).toBeNull();
			expect(game.state!.previousPlayerIndex).toBeNull();
			expect(game.state!.previousActualRoll).toBeNull();
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
			expect(game.getPublicState('p1').previousActualRoll).toBeNull();
			expect(game.getPublicState('p2').previousActualRoll).toBeNull();
		});

		it('throws when game not initialized', () => {
			expect(() => new PankovGame().getPublicState('p1')).toThrow('Game not initialized');
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

});
