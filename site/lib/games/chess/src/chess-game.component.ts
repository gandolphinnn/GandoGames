import { Component, computed, input, output, signal } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import type {
	ChessGameState,
	PieceColor,
	PieceType,
	PromotionPiece,
} from '@gandogames/common/chess';
import { GameComponent } from '@gandogames/lib/game-registry';
import { OUTCOME_LABELS, PIECE_GLYPHS, PROMOTION_CHOICES } from './chess.models';

interface SquareView {
	index: number;
	piece: { type: PieceType; color: PieceColor } | null;
	light: boolean;
}

interface PlayerView {
	id: string;
	name: string;
	color: PieceColor;
	isTurn: boolean;
	isMe: boolean;
}

@Component({
	selector: 'gg-chess-game',
	standalone: true,
	imports: [IonButton],
	templateUrl: './chess-game.component.html',
	styleUrl: './chess-game.component.scss',
})
export class ChessGameComponent implements GameComponent<ChessGameState> {
	public readonly gameState = input.required<ChessGameState | null>();
	public readonly loading = input.required<boolean>();
	public readonly error = input.required<string | null>();
	public readonly myPlayFabId = input.required<string | null>();
	public readonly gameAction = output<{ action: string; data?: unknown }>();
	public readonly back = output<void>();
	public readonly playAgain = output<void>();

	protected readonly PROMOTION_CHOICES = PROMOTION_CHOICES;

	private readonly selected = signal<number | null>(null);
	protected readonly promotionMove = signal<{ from: number; to: number } | null>(null);

	protected readonly myColor = computed<PieceColor | null>(() => {
		const gs = this.gameState();
		const me = this.myPlayFabId();
		if (!gs || !me) return null;
		return gs.players.find(p => p.id === me)?.color ?? null;
	});

	protected readonly isMyTurn = computed(() => {
		const gs = this.gameState();
		return !!gs && gs.gamePhase === 'playing' && gs.turn === this.myColor();
	});

	/** Board squares in display order — flipped when the local player is Black. */
	protected readonly squares = computed((): SquareView[] => {
		const gs = this.gameState();
		if (!gs) return [];
		const blackOrientation = this.myColor() === 'black';
		const order: number[] = [];
		if (blackOrientation) {
			for (let i = 63; i >= 0; i--) order.push(i);
		} else {
			for (let i = 0; i < 64; i++) order.push(i);
		}
		return order.map(index => {
			const row = Math.floor(index / 8);
			const col = index % 8;
			return { index, piece: gs.board[index] ?? null, light: (row + col) % 2 === 0 };
		});
	});

	protected readonly legalTargets = computed((): Set<number> => {
		const gs = this.gameState();
		const sel = this.selected();
		if (!gs || sel === null) return new Set<number>();
		return new Set(gs.legalMoves.filter(m => m.from === sel).map(m => m.to));
	});

	protected readonly playerViews = computed((): PlayerView[] => {
		const gs = this.gameState();
		if (!gs) return [];
		const me = this.myPlayFabId();
		return gs.players.map(p => ({
			id: p.id,
			name: p.name,
			color: p.color,
			isTurn: gs.gamePhase === 'playing' && gs.turn === p.color,
			isMe: p.id === me,
		}));
	});

	protected readonly statusText = computed((): string => {
		const gs = this.gameState();
		if (!gs) return '';
		if (gs.gamePhase === 'game-over') return this.resultText();
		const turnName = gs.players.find(p => p.color === gs.turn)?.name ?? gs.turn;
		const check = gs.inCheck ? ' — Check!' : '';
		return this.isMyTurn() ? `Your move${check}` : `${turnName} to move${check}`;
	});

	protected readonly resultText = computed((): string => {
		const gs = this.gameState();
		const r = gs?.result;
		if (!gs || !r) return 'Game over';
		const label = OUTCOME_LABELS[r.outcome];
		if (!r.winner) return `Draw — ${label}`;
		const winnerName = gs.players.find(p => p.color === r.winner)?.name ?? r.winner;
		return `${winnerName} wins — ${label}`;
	});

	protected readonly opponentDrawOffer = computed((): boolean => {
		const gs = this.gameState();
		return !!gs && gs.gamePhase === 'playing' && gs.drawOffer !== null && gs.drawOffer !== this.myColor();
	});

	protected readonly myDrawOfferPending = computed((): boolean => {
		const gs = this.gameState();
		return !!gs && gs.gamePhase === 'playing' && gs.drawOffer !== null && gs.drawOffer === this.myColor();
	});

	protected glyph(piece: { type: PieceType }): string {
		return PIECE_GLYPHS[piece.type];
	}

	protected isSelected(index: number): boolean {
		return this.selected() === index;
	}

	protected isLastMove(index: number): boolean {
		const lm = this.gameState()?.lastMove;
		return !!lm && (lm.from === index || lm.to === index);
	}

	protected isCheckedKing(index: number): boolean {
		const gs = this.gameState();
		if (!gs || !gs.inCheck) return false;
		const piece = gs.board[index];
		return !!piece && piece.type === 'king' && piece.color === gs.turn;
	}

	protected onSquareClick(index: number): void {
		const gs = this.gameState();
		if (!gs || gs.gamePhase !== 'playing' || this.promotionMove() !== null) return;
		if (!this.isMyTurn()) return;

		const sel = this.selected();
		const piece = gs.board[index];
		const myColor = this.myColor();

		if (sel === null) {
			if (piece && piece.color === myColor) this.selected.set(index);
			return;
		}

		if (sel === index) {
			this.selected.set(null);
			return;
		}

		const moves = gs.legalMoves.filter(m => m.from === sel && m.to === index);
		if (moves.length === 0) {
			// Re-select another own piece, otherwise clear.
			this.selected.set(piece && piece.color === myColor ? index : null);
			return;
		}

		if (moves.some(m => m.promotion)) {
			this.promotionMove.set({ from: sel, to: index });
			return;
		}

		this.gameAction.emit({ action: 'move', data: { from: sel, to: index } });
		this.selected.set(null);
	}

	protected choosePromotion(promotion: PromotionPiece): void {
		const pm = this.promotionMove();
		if (!pm) return;
		this.gameAction.emit({ action: 'move', data: { from: pm.from, to: pm.to, promotion } });
		this.promotionMove.set(null);
		this.selected.set(null);
	}

	protected cancelPromotion(): void {
		this.promotionMove.set(null);
		this.selected.set(null);
	}

	protected resign(): void { this.gameAction.emit({ action: 'resign' }); }
	protected offerDraw(): void { this.gameAction.emit({ action: 'offer-draw' }); }
	protected acceptDraw(): void { this.gameAction.emit({ action: 'accept-draw' }); }
	protected declineDraw(): void { this.gameAction.emit({ action: 'decline-draw' }); }
}
