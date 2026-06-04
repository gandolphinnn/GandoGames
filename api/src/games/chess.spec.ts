import { ChessGame, createInitialBoard, generateLegalMoves, isInsufficientMaterial } from './chess';
import type { GamePlayer } from '@gandogames/common/api';
import type { ChessPiece, PieceColor, PieceType, PromotionPiece } from '@gandogames/common/chess';

const p1: GamePlayer = { id: 'p1', name: 'Alice', icon: 'profile', theme: 'dark', language: 'en', isGuest: false };
const p2: GamePlayer = { id: 'p2', name: 'Bob', icon: 'profile', theme: 'dark', language: 'en', isGuest: false };

/** Algebraic square ('e4') → board index (row*8 + col, row 0 = rank 8). */
function sq(alg: string): number {
	const col = alg.charCodeAt(0) - 'a'.charCodeAt(0);
	const row = 8 - Number(alg[1]);
	return row * 8 + col;
}

function move(g: ChessGame, player: GamePlayer, from: string, to: string, promotion?: PromotionPiece): void {
	g.action(player, 'move', { from: sq(from), to: sq(to), promotion });
}

function emptyBoard(): (ChessPiece | null)[] {
	return Array.from({ length: 64 }, () => null);
}

function put(board: (ChessPiece | null)[], alg: string, type: PieceType, color: PieceColor): void {
	board[sq(alg)] = { type, color };
}

/** Replaces the standard position with a custom one and refreshes the legal-move list. */
function setPosition(g: ChessGame, board: (ChessPiece | null)[], turn: PieceColor): void {
	g.initialize([p1, p2]);
	const s = g.state!;
	s.board = board;
	s.turn = turn;
	s.castling = { whiteKingside: false, whiteQueenside: false, blackKingside: false, blackQueenside: false };
	s.enPassant = null;
	s.halfmoveClock = 0;
	s.inCheck = false;
	s.legalMoves = generateLegalMoves(board, turn, s.castling, null);
	s.positionHistory = [];
}

describe('ChessGame', () => {
	let game: ChessGame;

	beforeEach(() => {
		game = new ChessGame();
		game.initialize([p1, p2]);
	});

	describe('initialize', () => {
		it('starts with white to move, 20 legal moves, no check', () => {
			const s = game.state!;
			expect(s.turn).toBe('white');
			expect(s.gamePhase).toBe('playing');
			expect(s.legalMoves.length).toBe(20);
			expect(s.inCheck).toBe(false);
			expect(s.fullmoveNumber).toBe(1);
		});

		it('assigns white to player 0 and black to player 1', () => {
			expect(game.state!.players[0]!.color).toBe('white');
			expect(game.state!.players[1]!.color).toBe('black');
		});
	});

	describe('move validation', () => {
		it('ignores a move from the player who is not on turn', () => {
			move(game, p2, 'e7', 'e5'); // black moves on white's turn
			expect(game.state!.turn).toBe('white');
			expect(game.state!.board[sq('e7')]).not.toBeNull();
		});

		it('ignores an illegal move', () => {
			move(game, p1, 'e2', 'e5'); // pawn can't jump three
			expect(game.state!.turn).toBe('white');
			expect(game.state!.board[sq('e5')]).toBeNull();
		});

		it('applies a legal move and flips the turn', () => {
			move(game, p1, 'e2', 'e4');
			expect(game.state!.board[sq('e4')]).toEqual({ type: 'pawn', color: 'white' });
			expect(game.state!.board[sq('e2')]).toBeNull();
			expect(game.state!.turn).toBe('black');
			expect(game.state!.enPassant).toBe(sq('e3'));
		});
	});

	describe('checkmate', () => {
		it("detects Fool's mate", () => {
			move(game, p1, 'f2', 'f3');
			move(game, p2, 'e7', 'e5');
			move(game, p1, 'g2', 'g4');
			move(game, p2, 'd8', 'h4'); // Qh4#
			const s = game.state!;
			expect(s.gamePhase).toBe('game-over');
			expect(s.result).toEqual({ outcome: 'checkmate', winner: 'black' });
			expect(s.winnerName).toBe('Bob');
		});
	});

	describe('en passant', () => {
		it('exposes an en-passant target and captures correctly', () => {
			move(game, p1, 'e2', 'e4');
			move(game, p2, 'a7', 'a6');
			move(game, p1, 'e4', 'e5');
			move(game, p2, 'd7', 'd5'); // sets en-passant target on d6
			expect(game.state!.enPassant).toBe(sq('d6'));

			move(game, p1, 'e5', 'd6'); // exd6 e.p.
			expect(game.state!.board[sq('d6')]).toEqual({ type: 'pawn', color: 'white' });
			expect(game.state!.board[sq('d5')]).toBeNull(); // captured pawn removed
		});
	});

	describe('castling', () => {
		it('castles kingside for white and relocates the rook', () => {
			move(game, p1, 'e2', 'e4');
			move(game, p2, 'a7', 'a6');
			move(game, p1, 'g1', 'f3');
			move(game, p2, 'b7', 'b6');
			move(game, p1, 'f1', 'c4');
			move(game, p2, 'c7', 'c6');
			move(game, p1, 'e1', 'g1'); // O-O

			const s = game.state!;
			expect(s.board[sq('g1')]).toEqual({ type: 'king', color: 'white' });
			expect(s.board[sq('f1')]).toEqual({ type: 'rook', color: 'white' });
			expect(s.board[sq('e1')]).toBeNull();
			expect(s.board[sq('h1')]).toBeNull();
			expect(s.castling.whiteKingside).toBe(false);
		});
	});

	describe('promotion', () => {
		it('promotes a pawn to the chosen piece', () => {
			const board = emptyBoard();
			put(board, 'e1', 'king', 'white');
			put(board, 'e8', 'king', 'black');
			put(board, 'a7', 'pawn', 'white');
			setPosition(game, board, 'white');

			move(game, p1, 'a7', 'a8', 'queen');
			expect(game.state!.board[sq('a8')]).toEqual({ type: 'queen', color: 'white' });
			expect(game.state!.board[sq('a7')]).toBeNull();
			expect(game.state!.turn).toBe('black');
		});

		it('rejects a promotion move without the promotion piece', () => {
			const board = emptyBoard();
			put(board, 'e1', 'king', 'white');
			put(board, 'e8', 'king', 'black');
			put(board, 'a7', 'pawn', 'white');
			setPosition(game, board, 'white');

			move(game, p1, 'a7', 'a8'); // no promotion specified → not a legal move
			expect(game.state!.board[sq('a8')]).toBeNull();
			expect(game.state!.turn).toBe('white');
		});
	});

	describe('stalemate', () => {
		it('detects stalemate as a draw', () => {
			const board = emptyBoard();
			put(board, 'h8', 'king', 'black');
			put(board, 'f7', 'king', 'white');
			put(board, 'g5', 'queen', 'white');
			setPosition(game, board, 'white');

			move(game, p1, 'g5', 'g6'); // black king has no legal move and is not in check
			const s = game.state!;
			expect(s.gamePhase).toBe('game-over');
			expect(s.result).toEqual({ outcome: 'stalemate', winner: null });
		});
	});

	describe('insufficient material', () => {
		it('king vs king is a draw', () => {
			const board = emptyBoard();
			put(board, 'e1', 'king', 'white');
			put(board, 'e8', 'king', 'black');
			expect(isInsufficientMaterial(board)).toBe(true);
		});

		it('king and bishop vs king is a draw', () => {
			const board = emptyBoard();
			put(board, 'e1', 'king', 'white');
			put(board, 'c1', 'bishop', 'white');
			put(board, 'e8', 'king', 'black');
			expect(isInsufficientMaterial(board)).toBe(true);
		});

		it('king and rook vs king is not a draw', () => {
			const board = emptyBoard();
			put(board, 'e1', 'king', 'white');
			put(board, 'a1', 'rook', 'white');
			put(board, 'e8', 'king', 'black');
			expect(isInsufficientMaterial(board)).toBe(false);
		});

		it('ends the game when a capture leaves only kings', () => {
			const board = emptyBoard();
			put(board, 'd4', 'king', 'white');
			put(board, 'e8', 'king', 'black');
			put(board, 'd5', 'queen', 'black'); // checks the white king on d4
			setPosition(game, board, 'white');

			move(game, p1, 'd4', 'd5'); // Kxd5 → only the two kings remain
			expect(game.state!.gamePhase).toBe('game-over');
			expect(game.state!.result).toEqual({ outcome: 'insufficient-material', winner: null });
		});
	});

	describe('resign and draw', () => {
		it('awards the win to the opponent on resignation', () => {
			game.action(p2, 'resign', {});
			expect(game.state!.gamePhase).toBe('game-over');
			expect(game.state!.result).toEqual({ outcome: 'resignation', winner: 'white' });
			expect(game.state!.winnerName).toBe('Alice');
		});

		it('records a draw offer and ends as a draw when accepted', () => {
			game.action(p1, 'offer-draw', {});
			expect(game.state!.drawOffer).toBe('white');

			game.action(p1, 'accept-draw', {}); // offerer cannot accept their own
			expect(game.state!.gamePhase).toBe('playing');

			game.action(p2, 'accept-draw', {});
			expect(game.state!.gamePhase).toBe('game-over');
			expect(game.state!.result).toEqual({ outcome: 'draw-agreed', winner: null });
		});

		it('clears a draw offer when declined', () => {
			game.action(p1, 'offer-draw', {});
			game.action(p2, 'decline-draw', {});
			expect(game.state!.drawOffer).toBeNull();
			expect(game.state!.gamePhase).toBe('playing');
		});
	});

	describe('getPublicState', () => {
		it('exposes the full board but strips the position history', () => {
			const pub = game.getPublicState('p1');
			expect(pub.board.filter(Boolean).length).toBe(32);
			expect(pub.positionHistory).toEqual([]);
		});
	});

	describe('createInitialBoard', () => {
		it('places 32 pieces in the standard layout', () => {
			const board = createInitialBoard();
			expect(board.filter(Boolean).length).toBe(32);
			expect(board[sq('e1')]).toEqual({ type: 'king', color: 'white' });
			expect(board[sq('d8')]).toEqual({ type: 'queen', color: 'black' });
		});
	});
});
