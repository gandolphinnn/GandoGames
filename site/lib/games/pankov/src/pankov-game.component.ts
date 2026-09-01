import { Component, computed, inject, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PankovGameState, type PankovPlayer, INITIAL_LIVES, PANKOV_VALUE, ROLL_VALUES, type RollValue, getValidDeclarations } from '@gandogames/shared/pankov';
import { GameComponent } from '@gandogames/lib/game-registry';
import { buildTableSeats, GameTableComponent, GameTableSeatDef, TableSeat } from '@gandogames/lib/common/game-table';
import { PlayerAvatarComponent } from '@gandogames/lib/common/player-avatar';

@Component({
	selector: 'gg-pankov-game',
	standalone: true,
	imports: [IonButton, GameTableComponent, GameTableSeatDef, PlayerAvatarComponent, TranslatePipe],
	templateUrl: './pankov-game.component.html',
	styleUrl: './pankov-game.component.scss',
})
export class PankovGameComponent implements GameComponent<PankovGameState> {
	private readonly translate = inject(TranslateService);

	public readonly gameState = input.required<PankovGameState | null>();
	public readonly loading = input.required<boolean>();
	public readonly error = input.required<string | null>();
	public readonly myPlayFabId = input.required<string | null>();
	public readonly gameAction = output<{ action: string; data?: unknown }>();
	public readonly playAgain = output<void>();

	protected readonly ROLL_VALUES = ROLL_VALUES;

	/** Localized twin of the shared `formatValue`: called from template bindings, so it re-runs on language change. */
	protected formatValue(value: RollValue): string {
		if (value === PANKOV_VALUE) return this.translate.instant('PANKOV.VALUE_PANKOV') as string;
		const high = Math.floor(value / 10);
		const low = value % 10;
		if (high === low) return this.translate.instant('PANKOV.VALUE_PAIR', { n: high }) as string;
		return `${high}-${low}`;
	}

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
		if (gs.previousTurn?.declaration !== PANKOV_VALUE || gs.pankovStreak < 1) return 1;
		return Math.pow(2, gs.pankovStreak - 1);
	});

	/** Seat ring: only the seated players, me rotated to bottom-centre — no empty seats in-game. */
	protected readonly seats = computed<TableSeat[]>(() => {
		const gs = this.gameState();
		if (!gs) return [];
		const isActive = gs.gamePhase !== 'result' && gs.gamePhase !== 'game-over';
		const currentId = gs.players[gs.currentPlayerIndex]?.id;
		return buildTableSeats(gs.players, this.myPlayFabId(), gs.players.length, p => ({
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
		if (!gs || gs.previousTurn === null) return null;
		return gs.players[gs.previousTurn.playerIndex] ?? null;
	});

	protected readonly isMyTurn = computed(() => this.currentPlayer()?.id === this.myPlayFabId());

	protected readonly validDeclarations = computed((): RollValue[] => {
		const gs = this.gameState();
		if (!gs) return [];
		return getValidDeclarations(gs.previousTurn?.declaration || null);
	});

	protected readonly canRoll = computed(() => this.validDeclarations().length > 0);

	protected roll(): void { this.gameAction.emit({ action: 'roll' }); }
	protected challenge(): void { this.gameAction.emit({ action: 'challenge' }); }
	protected declare(declaration: RollValue): void { this.gameAction.emit({ action: 'declare', data: { declaration } }); }
	protected continueGame(): void { this.gameAction.emit({ action: 'continue' }); }
}
