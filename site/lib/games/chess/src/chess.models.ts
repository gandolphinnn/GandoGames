export type {
	PieceColor,
	PieceType,
	PromotionPiece,
	ChessPiece,
	ChessMove,
	ChessGameState,
	ChessGameResult,
	ChessPlayer,
	ChessOutcome,
} from '@gandogames/common/chess';

import type { PieceType, PromotionPiece, ChessOutcome } from '@gandogames/common/chess';

/** Filled Unicode chess glyphs (♚♛♜♝♞♟); colour is applied via CSS. */
export const PIECE_GLYPHS: Record<PieceType, string> = {
	king: '♚',
	queen: '♛',
	rook: '♜',
	bishop: '♝',
	knight: '♞',
	pawn: '♟',
};

export const PROMOTION_CHOICES: PromotionPiece[] = ['queen', 'rook', 'bishop', 'knight'];

export const OUTCOME_LABELS: Record<ChessOutcome, string> = {
	'checkmate': 'Checkmate',
	'resignation': 'Resignation',
	'stalemate': 'Stalemate',
	'fifty-move': 'Fifty-move rule',
	'threefold': 'Threefold repetition',
	'insufficient-material': 'Insufficient material',
	'draw-agreed': 'Draw agreed',
};
