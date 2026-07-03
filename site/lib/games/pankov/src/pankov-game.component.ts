import { Component, computed, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { PankovGameState, type PankovPlayer, formatValue, getRank, INITIAL_LIVES, PANKOV_VALUE, ROLL_VALUES, type RollValue } from '@gandogames/shared/pankov';
import { GameComponent } from '@gandogames/lib/game-registry';
import { buildTableSeats, GameTableComponent, GameTableSeatDef, TableSeat } from '@gandogames/lib/common/game-table';
import { PlayerAvatarComponent } from '@gandogames/lib/common/player-avatar';
import { PANKOV_TABLE_PRESET } from './pankov.table';

@Component({
	selector: 'gg-pankov-game',
	standalone: true,
	imports: [IonButton, GameTableComponent, GameTableSeatDef, PlayerAvatarComponent],
	templateUrl: './pankov-game.component.html',
	styleUrl: './pankov-game.component.scss',
})
export class PankovGameComponent implements GameComponent<PankovGameState> {
	public readonly gameState = input.required<PankovGameState | null>();
	public readonly loading = input.required<boolean>();
	public readonly error = input.required<string | null>();
	public readonly myPlayFabId = input.required<string | null>();
	public readonly gameAction = output<{ action: string; data?: unknown }>();
	public readonly back = output<void>();
	public readonly playAgain = output<void>();

	protected readonly ROLL_VALUES = ROLL_VALUES;
	protected readonly formatValue = formatValue;

	/** Life-pip slots, sized to the room's configured starting lives. */
	protected readonly livesRange = computed(() => {
		const max = this.gameState()?.settings.initialLives ?? INITIAL_LIVES;
		return Array.from({ length: max }, (_, i) => i);
	});

	/**
	 * Lives a wrong challenge would cost right now: 1 normally, or 2^(streak-1) during a Pankov run
	 * when sudden death is on. Drives the "risk" hint on the Challenge button.
	 */
	protected readonly challengeStake = computed(() => {
		const gs = this.gameState();
		if (!gs || !gs.settings.suddenDeath) return 1;
		if (gs.previousDeclaration !== PANKOV_VALUE || gs.pankovStreak < 1) return 1;
		return Math.pow(2, gs.pankovStreak - 1);
	});

	/** Seat ring: players in playing order, me rotated to bottom-centre, padded to the table's seat count. */
	protected readonly seats = computed<TableSeat[]>(() => {
		const gs = this.gameState();
		if (!gs) return [];
		const maxSeats = PANKOV_TABLE_PRESET.seats ?? gs.players.length;
		const isActive = gs.gamePhase !== 'result' && gs.gamePhase !== 'game-over';
		const currentId = gs.players[gs.currentPlayerIndex]?.id;
		return buildTableSeats(gs.players, this.myPlayFabId(), maxSeats, p => ({
			isCurrentTurn: isActive && p.id === currentId,
			faded: p.lives === 0,
		}));
	});

	/** Narrow a seat's player back to the pankov shape (`buildTableSeats` preserves the object). */
	protected seatPlayer(seat: TableSeat): PankovPlayer | null {
		return seat.player as PankovPlayer | null;
	}

	protected readonly currentPlayer = computed(() => {
		const gs = this.gameState();
		if (!gs) return null;
		return gs.players[gs.currentPlayerIndex] ?? null;
	});

	protected readonly previousPlayer = computed(() => {
		const gs = this.gameState();
		if (!gs || gs.previousPlayerIndex === null) return null;
		return gs.players[gs.previousPlayerIndex] ?? null;
	});

	protected readonly isMyTurn = computed(() => this.currentPlayer()?.id === this.myPlayFabId());

	protected readonly validDeclarations = computed((): RollValue[] => {
		const gs = this.gameState();
		if (!gs) return [];
		const minRank = gs.previousDeclaration !== null ? getRank(gs.previousDeclaration) : 0;
		return (ROLL_VALUES as readonly RollValue[]).filter(v => getRank(v) >= minRank);
	});

	protected readonly canRoll = computed(() => this.validDeclarations().length > 0);

	protected roll(): void { this.gameAction.emit({ action: 'roll' }); }
	protected challenge(): void { this.gameAction.emit({ action: 'challenge' }); }
	protected declare(declaration: RollValue): void { this.gameAction.emit({ action: 'declare', data: { declaration } }); }
	protected continueGame(): void { this.gameAction.emit({ action: 'continue' }); }
}
