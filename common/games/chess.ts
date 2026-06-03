import { GamePlayer, GameState, RoomData } from "..";

export type PieceColor = 'white' | 'black';
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type PromotionPiece = 'knight' | 'bishop' | 'rook' | 'queen';

export interface ChessPiece {
	type: PieceType;
	color: PieceColor;
}

/** A square is an index 0..63 where index = row * 8 + col.
 *  row 0 = rank 8 (top, black back rank), row 7 = rank 1 (bottom, white back rank).
 *  col 0 = file a, col 7 = file h. */
export interface ChessMove {
	from: number;
	to: number;
	/** Set only when a pawn reaches the last rank. */
	promotion?: PromotionPiece;
}

export interface CastlingRights {
	whiteKingside: boolean;
	whiteQueenside: boolean;
	blackKingside: boolean;
	blackQueenside: boolean;
}

export type ChessOutcome =
	| 'checkmate'
	| 'resignation'
	| 'stalemate'
	| 'fifty-move'
	| 'threefold'
	| 'insufficient-material'
	| 'draw-agreed';

export interface ChessGameResult {
	outcome: ChessOutcome;
	/** null = draw. */
	winner: PieceColor | null;
}

export interface ChessPlayer extends GamePlayer {
	color: PieceColor;
}

export interface ChessGameState extends GameState {
	gamePhase: 'playing' | 'game-over';
	players: ChessPlayer[];
	/** 64 squares, index = row * 8 + col. null = empty. */
	board: (ChessPiece | null)[];
	turn: PieceColor;
	castling: CastlingRights;
	/** En passant target square (the empty square a pawn skipped), or null. */
	enPassant: number | null;
	/** Half-moves since the last capture or pawn move (for the 50-move rule). */
	halfmoveClock: number;
	/** Increments after each black move. */
	fullmoveNumber: number;
	/** Whether the side to move is currently in check. */
	inCheck: boolean;
	/** Legal moves for the side to move (provided for the UI). */
	legalMoves: ChessMove[];
	/** The last move played, for board highlighting. */
	lastMove: { from: number; to: number } | null;
	/** Colour with a pending draw offer awaiting the opponent's response, or null. */
	drawOffer: PieceColor | null;
	/** Position keys for threefold detection. Always [] in public state. */
	positionHistory: string[];
	result?: ChessGameResult;
	winnerName?: string;
}

export interface ChessRoomState extends RoomData {
	gameState?: ChessGameState;
}

export interface ChessActionRequest {
	action: 'move' | 'resign' | 'offer-draw' | 'accept-draw' | 'decline-draw';
	from?: number;
	to?: number;
	promotion?: PromotionPiece;
}
