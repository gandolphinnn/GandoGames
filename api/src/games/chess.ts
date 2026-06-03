import type { GamePlayer } from '@gandogames/common/api';
import type {
	CastlingRights,
	ChessGameResult,
	ChessGameState,
	ChessMove,
	ChessPiece,
	PieceColor,
	PieceType,
	PromotionPiece,
} from '@gandogames/common/chess';
import { Game } from './game';

type Board = (ChessPiece | null)[];

const PROMOTION_PIECES: PromotionPiece[] = ['queen', 'rook', 'bishop', 'knight'];

const KNIGHT_OFFSETS: ReadonlyArray<[number, number]> = [
	[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_OFFSETS: ReadonlyArray<[number, number]> = [
	[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
];
const BISHOP_DIRS: ReadonlyArray<[number, number]> = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS: ReadonlyArray<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function rowOf(square: number): number { return Math.floor(square / 8); }
function colOf(square: number): number { return square % 8; }
function squareOf(row: number, col: number): number { return row * 8 + col; }
function inBounds(row: number, col: number): boolean { return row >= 0 && row < 8 && col >= 0 && col < 8; }

function opponent(color: PieceColor): PieceColor { return color === 'white' ? 'black' : 'white'; }

function cloneBoard(board: Board): Board {
	return board.map(p => (p ? { type: p.type, color: p.color } : null));
}

export function createInitialBoard(): Board {
	const board: Board = Array.from({ length: 64 }, () => null);
	const backRank: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
	for (let col = 0; col < 8; col++) {
		board[squareOf(0, col)] = { type: backRank[col]!, color: 'black' };
		board[squareOf(1, col)] = { type: 'pawn', color: 'black' };
		board[squareOf(6, col)] = { type: 'pawn', color: 'white' };
		board[squareOf(7, col)] = { type: backRank[col]!, color: 'white' };
	}
	return board;
}

function findKing(board: Board, color: PieceColor): number {
	for (let i = 0; i < 64; i++) {
		const p = board[i];
		if (p && p.type === 'king' && p.color === color) return i;
	}
	return -1;
}

/** Whether `square` is attacked by any piece of `byColor`. */
function isSquareAttacked(board: Board, square: number, byColor: PieceColor): boolean {
	const r = rowOf(square);
	const c = colOf(square);

	// Pawn attacks: a white pawn on (r+1, c±1) attacks (r,c); black pawn on (r-1, c±1).
	const pawnRow = byColor === 'white' ? r + 1 : r - 1;
	for (const dc of [-1, 1]) {
		if (inBounds(pawnRow, c + dc)) {
			const p = board[squareOf(pawnRow, c + dc)];
			if (p && p.color === byColor && p.type === 'pawn') return true;
		}
	}

	// Knight attacks.
	for (const [dr, dc] of KNIGHT_OFFSETS) {
		if (inBounds(r + dr, c + dc)) {
			const p = board[squareOf(r + dr, c + dc)];
			if (p && p.color === byColor && p.type === 'knight') return true;
		}
	}

	// King attacks.
	for (const [dr, dc] of KING_OFFSETS) {
		if (inBounds(r + dr, c + dc)) {
			const p = board[squareOf(r + dr, c + dc)];
			if (p && p.color === byColor && p.type === 'king') return true;
		}
	}

	// Sliding attacks: bishop/queen on diagonals, rook/queen on lines.
	for (const [dr, dc] of BISHOP_DIRS) {
		let nr = r + dr, nc = c + dc;
		while (inBounds(nr, nc)) {
			const p = board[squareOf(nr, nc)];
			if (p) {
				if (p.color === byColor && (p.type === 'bishop' || p.type === 'queen')) return true;
				break;
			}
			nr += dr; nc += dc;
		}
	}
	for (const [dr, dc] of ROOK_DIRS) {
		let nr = r + dr, nc = c + dc;
		while (inBounds(nr, nc)) {
			const p = board[squareOf(nr, nc)];
			if (p) {
				if (p.color === byColor && (p.type === 'rook' || p.type === 'queen')) return true;
				break;
			}
			nr += dr; nc += dc;
		}
	}

	return false;
}

function isInCheck(board: Board, color: PieceColor): boolean {
	const king = findKing(board, color);
	if (king < 0) return false;
	return isSquareAttacked(board, king, opponent(color));
}

/** Applies a move to a cloned board and returns it. Handles en passant capture,
 *  castling rook movement, and promotion. Does not mutate the input. */
function boardAfterMove(board: Board, move: ChessMove, enPassant: number | null): Board {
	const next = cloneBoard(board);
	const piece = next[move.from]!;
	const fromCol = colOf(move.from);
	const toCol = colOf(move.to);

	// En passant capture: a pawn moving diagonally onto the en-passant target.
	if (piece.type === 'pawn' && move.to === enPassant && fromCol !== toCol) {
		const capturedRow = rowOf(move.from);
		next[squareOf(capturedRow, toCol)] = null;
	}

	// Castling: king moves two columns — relocate the rook.
	if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
		const row = rowOf(move.from);
		if (toCol === 6) {
			next[squareOf(row, 5)] = next[squareOf(row, 7)];
			next[squareOf(row, 7)] = null;
		} else if (toCol === 2) {
			next[squareOf(row, 3)] = next[squareOf(row, 0)];
			next[squareOf(row, 0)] = null;
		}
	}

	next[move.to] = move.promotion ? { type: move.promotion, color: piece.color } : piece;
	next[move.from] = null;
	return next;
}

/** Pseudo-legal moves for `color` (ignoring whether the king is left in check),
 *  including castling, en passant, and promotion expansions. */
function generatePseudoLegalMoves(
	board: Board,
	color: PieceColor,
	castling: CastlingRights,
	enPassant: number | null,
): ChessMove[] {
	const moves: ChessMove[] = [];

	for (let from = 0; from < 64; from++) {
		const piece = board[from];
		if (!piece || piece.color !== color) continue;
		const r = rowOf(from);
		const c = colOf(from);

		switch (piece.type) {
			case 'pawn': {
				const dir = color === 'white' ? -1 : 1;
				const startRow = color === 'white' ? 6 : 1;
				const promoteRow = color === 'white' ? 0 : 7;

				// Forward one.
				const oneRow = r + dir;
				if (inBounds(oneRow, c) && !board[squareOf(oneRow, c)]) {
					addPawnMove(moves, from, squareOf(oneRow, c), oneRow === promoteRow);
					// Forward two from start.
					const twoRow = r + 2 * dir;
					if (r === startRow && !board[squareOf(twoRow, c)]) {
						moves.push({ from, to: squareOf(twoRow, c) });
					}
				}
				// Captures (including en passant).
				for (const dc of [-1, 1]) {
					const nc = c + dc;
					if (!inBounds(oneRow, nc)) continue;
					const target = squareOf(oneRow, nc);
					const occupant = board[target];
					if (occupant && occupant.color !== color) {
						addPawnMove(moves, from, target, oneRow === promoteRow);
					} else if (!occupant && target === enPassant) {
						moves.push({ from, to: target });
					}
				}
				break;
			}
			case 'knight': {
				for (const [dr, dc] of KNIGHT_OFFSETS) {
					if (!inBounds(r + dr, c + dc)) continue;
					const target = squareOf(r + dr, c + dc);
					const occupant = board[target];
					if (!occupant || occupant.color !== color) moves.push({ from, to: target });
				}
				break;
			}
			case 'king': {
				for (const [dr, dc] of KING_OFFSETS) {
					if (!inBounds(r + dr, c + dc)) continue;
					const target = squareOf(r + dr, c + dc);
					const occupant = board[target];
					if (!occupant || occupant.color !== color) moves.push({ from, to: target });
				}
				addCastlingMoves(moves, board, color, castling);
				break;
			}
			default: {
				const dirs = piece.type === 'bishop' ? BISHOP_DIRS
					: piece.type === 'rook' ? ROOK_DIRS
						: [...BISHOP_DIRS, ...ROOK_DIRS]; // queen
				for (const [dr, dc] of dirs) {
					let nr = r + dr, nc = c + dc;
					while (inBounds(nr, nc)) {
						const target = squareOf(nr, nc);
						const occupant = board[target];
						if (!occupant) {
							moves.push({ from, to: target });
						} else {
							if (occupant.color !== color) moves.push({ from, to: target });
							break;
						}
						nr += dr; nc += dc;
					}
				}
			}
		}
	}

	return moves;
}

function addPawnMove(moves: ChessMove[], from: number, to: number, promoting: boolean): void {
	if (promoting) {
		for (const promotion of PROMOTION_PIECES) moves.push({ from, to, promotion });
	} else {
		moves.push({ from, to });
	}
}

function addCastlingMoves(moves: ChessMove[], board: Board, color: PieceColor, castling: CastlingRights): void {
	const row = color === 'white' ? 7 : 0;
	const kingFrom = squareOf(row, 4);
	if (board[kingFrom]?.type !== 'king' || board[kingFrom]?.color !== color) return;
	const enemy = opponent(color);
	if (isSquareAttacked(board, kingFrom, enemy)) return; // can't castle out of check

	const kingside = color === 'white' ? castling.whiteKingside : castling.blackKingside;
	const queenside = color === 'white' ? castling.whiteQueenside : castling.blackQueenside;

	// Kingside: f and g empty, king path e->f->g not attacked, rook on h.
	if (kingside
		&& !board[squareOf(row, 5)] && !board[squareOf(row, 6)]
		&& board[squareOf(row, 7)]?.type === 'rook' && board[squareOf(row, 7)]?.color === color
		&& !isSquareAttacked(board, squareOf(row, 5), enemy)
		&& !isSquareAttacked(board, squareOf(row, 6), enemy)) {
		moves.push({ from: kingFrom, to: squareOf(row, 6) });
	}
	// Queenside: b, c, d empty, king path e->d->c not attacked, rook on a.
	if (queenside
		&& !board[squareOf(row, 1)] && !board[squareOf(row, 2)] && !board[squareOf(row, 3)]
		&& board[squareOf(row, 0)]?.type === 'rook' && board[squareOf(row, 0)]?.color === color
		&& !isSquareAttacked(board, squareOf(row, 3), enemy)
		&& !isSquareAttacked(board, squareOf(row, 2), enemy)) {
		moves.push({ from: kingFrom, to: squareOf(row, 2) });
	}
}

/** Pseudo-legal moves filtered so the mover's king is not left in check. */
export function generateLegalMoves(
	board: Board,
	color: PieceColor,
	castling: CastlingRights,
	enPassant: number | null,
): ChessMove[] {
	const pseudo = generatePseudoLegalMoves(board, color, castling, enPassant);
	return pseudo.filter(move => !isInCheck(boardAfterMove(board, move, enPassant), color));
}

function updateCastlingRights(rights: CastlingRights, move: ChessMove, piece: ChessPiece): CastlingRights {
	const next: CastlingRights = { ...rights };

	if (piece.type === 'king') {
		if (piece.color === 'white') { next.whiteKingside = false; next.whiteQueenside = false; }
		else { next.blackKingside = false; next.blackQueenside = false; }
	}

	// A rook leaving its home square, or being captured on it, voids that right.
	const A1 = squareOf(7, 0), H1 = squareOf(7, 7), A8 = squareOf(0, 0), H8 = squareOf(0, 7);
	for (const sq of [move.from, move.to]) {
		if (sq === A1) next.whiteQueenside = false;
		else if (sq === H1) next.whiteKingside = false;
		else if (sq === A8) next.blackQueenside = false;
		else if (sq === H8) next.blackKingside = false;
	}

	return next;
}

/** Compact position key for threefold detection: pieces + side + castling + en passant. */
function positionKey(board: Board, turn: PieceColor, castling: CastlingRights, enPassant: number | null): string {
	let pieces = '';
	for (let i = 0; i < 64; i++) {
		const p = board[i];
		if (!p) { pieces += '.'; continue; }
		const letters: Record<PieceType, string> = {
			pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
		};
		const ch = letters[p.type];
		pieces += p.color === 'white' ? ch.toUpperCase() : ch;
	}
	const c = `${castling.whiteKingside ? 'K' : ''}${castling.whiteQueenside ? 'Q' : ''}${castling.blackKingside ? 'k' : ''}${castling.blackQueenside ? 'q' : ''}` || '-';
	return `${pieces} ${turn[0]} ${c} ${enPassant ?? '-'}`;
}

export function isInsufficientMaterial(board: Board): boolean {
	const pieces: { type: PieceType; color: PieceColor; square: number }[] = [];
	for (let i = 0; i < 64; i++) {
		const p = board[i];
		if (p) pieces.push({ type: p.type, color: p.color, square: i });
	}
	const nonKings = pieces.filter(p => p.type !== 'king');
	// K vs K
	if (nonKings.length === 0) return true;
	// K + single minor vs K
	if (nonKings.length === 1 && (nonKings[0]!.type === 'bishop' || nonKings[0]!.type === 'knight')) return true;
	// K+B vs K+B with both bishops on the same colour square
	if (nonKings.length === 2 && nonKings.every(p => p.type === 'bishop')
		&& nonKings[0]!.color !== nonKings[1]!.color) {
		const sqColor = (sq: number) => (rowOf(sq) + colOf(sq)) % 2;
		if (sqColor(nonKings[0]!.square) === sqColor(nonKings[1]!.square)) return true;
	}
	return false;
}

export class ChessGame extends Game<ChessGameState> {
	public override minPlayers = 2;
	public override maxPlayers = 2;

	public override initialize(players: GamePlayer[]): void {
		const board = createInitialBoard();
		const castling: CastlingRights = {
			whiteKingside: true, whiteQueenside: true, blackKingside: true, blackQueenside: true,
		};
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'playing',
			players: players.map((p, i) => ({ ...p, color: i === 0 ? 'white' : 'black' })),
			board,
			turn: 'white',
			castling,
			enPassant: null,
			halfmoveClock: 0,
			fullmoveNumber: 1,
			inCheck: false,
			legalMoves: generateLegalMoves(board, 'white', castling, null),
			lastMove: null,
			drawOffer: null,
			positionHistory: [positionKey(board, 'white', castling, null)],
		};
	}

	public override getPublicState(_playerId: string): ChessGameState {
		if (!this.state) throw new Error('Game not initialized');
		// The board is fully public; only the (large, internal) history is stripped.
		return { ...this.state, positionHistory: [] };
	}

	public override action(player: GamePlayer, action: string, data: any): ChessGameState {
		if (!this.state) throw new Error('Game not initialized');
		if (this.state.gamePhase !== 'playing') return this.state;

		switch (action) {
			case 'move': return this.applyMove(player.id, data?.from, data?.to, data?.promotion);
			case 'resign': return this.applyResign(player.id);
			case 'offer-draw': return this.applyOfferDraw(player.id);
			case 'accept-draw': return this.applyAcceptDraw(player.id);
			case 'decline-draw': return this.applyDeclineDraw(player.id);
			default: return this.state;
		}
	}

	private colorOf(playerId: string): PieceColor | null {
		return this.state!.players.find(p => p.id === playerId)?.color ?? null;
	}

	private applyMove(playerId: string, from: unknown, to: unknown, promotion: unknown): ChessGameState {
		const state = this.state!;
		const color = this.colorOf(playerId);
		if (!color || color !== state.turn) return state;
		if (typeof from !== 'number' || typeof to !== 'number') return state;

		// Validate against the authoritative legal-move list.
		const legal = state.legalMoves.find(m =>
			m.from === from && m.to === to && (m.promotion ?? null) === (promotion ?? null));
		if (!legal) return state;

		const piece = state.board[from]!;
		const isCapture = state.board[to] !== null
			|| (piece.type === 'pawn' && to === state.enPassant);
		const isPawnMove = piece.type === 'pawn';

		const newBoard = boardAfterMove(state.board, legal, state.enPassant);
		state.castling = updateCastlingRights(state.castling, legal, piece);

		// En passant target only after a double pawn push.
		if (isPawnMove && Math.abs(rowOf(to) - rowOf(from)) === 2) {
			state.enPassant = squareOf((rowOf(from) + rowOf(to)) / 2, colOf(from));
		} else {
			state.enPassant = null;
		}

		state.halfmoveClock = (isCapture || isPawnMove) ? 0 : state.halfmoveClock + 1;
		if (state.turn === 'black') state.fullmoveNumber += 1;

		state.board = newBoard;
		state.turn = opponent(state.turn);
		state.lastMove = { from, to };
		state.drawOffer = null;

		const key = positionKey(state.board, state.turn, state.castling, state.enPassant);
		state.positionHistory.push(key);

		this.recomputeAndCheckEnd();
		state.lastUpdate = new Date();
		return state;
	}

	/** Recomputes legal moves / check status for the side to move and applies any
	 *  terminal condition (mate, stalemate, or an automatic draw). */
	private recomputeAndCheckEnd(): void {
		const state = this.state!;
		state.inCheck = isInCheck(state.board, state.turn);
		state.legalMoves = generateLegalMoves(state.board, state.turn, state.castling, state.enPassant);

		if (state.legalMoves.length === 0) {
			this.endGame(state.inCheck
				? { outcome: 'checkmate', winner: opponent(state.turn) }
				: { outcome: 'stalemate', winner: null });
			return;
		}
		if (state.halfmoveClock >= 100) {
			this.endGame({ outcome: 'fifty-move', winner: null });
			return;
		}
		const currentKey = state.positionHistory[state.positionHistory.length - 1]!;
		if (state.positionHistory.filter(k => k === currentKey).length >= 3) {
			this.endGame({ outcome: 'threefold', winner: null });
			return;
		}
		if (isInsufficientMaterial(state.board)) {
			this.endGame({ outcome: 'insufficient-material', winner: null });
		}
	}

	private endGame(result: ChessGameResult): void {
		const state = this.state!;
		state.gamePhase = 'game-over';
		state.result = result;
		state.legalMoves = [];
		state.drawOffer = null;
		if (result.winner) {
			state.winnerName = state.players.find(p => p.color === result.winner)?.name;
		}
	}

	private applyResign(playerId: string): ChessGameState {
		const state = this.state!;
		const color = this.colorOf(playerId);
		if (!color) return state;
		this.endGame({ outcome: 'resignation', winner: opponent(color) });
		state.lastUpdate = new Date();
		return state;
	}

	private applyOfferDraw(playerId: string): ChessGameState {
		const state = this.state!;
		const color = this.colorOf(playerId);
		if (!color || state.drawOffer) return state;
		state.drawOffer = color;
		state.lastUpdate = new Date();
		return state;
	}

	private applyAcceptDraw(playerId: string): ChessGameState {
		const state = this.state!;
		const color = this.colorOf(playerId);
		// Only the opponent of the offerer may accept.
		if (!color || !state.drawOffer || state.drawOffer === color) return state;
		this.endGame({ outcome: 'draw-agreed', winner: null });
		state.lastUpdate = new Date();
		return state;
	}

	private applyDeclineDraw(playerId: string): ChessGameState {
		const state = this.state!;
		const color = this.colorOf(playerId);
		if (!color || !state.drawOffer || state.drawOffer === color) return state;
		state.drawOffer = null;
		state.lastUpdate = new Date();
		return state;
	}
}
