import { Component, computed, HostListener, input, output, signal } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import {
	type BattleshipGameState, type BattleshipPlayer, type Coord, type Orientation, type Ship, type ShipName,
	canPlace, coordKey, isShipSunk, shipCells,
} from '@gandogames/shared/battleship';
import { GameComponent } from '@gandogames/lib/game-registry';
import { PlayerAvatarComponent } from '@gandogames/lib/common/player-avatar';
import { AXIS, COLUMN_LABELS, FLEET_ROSTER, ROW_LABELS } from './battleship.models';

/** A ship placed on the setup board — tracks its anchor + orientation so it can be rotated in place. */
interface PlacedShip {
	name: ShipName;
	size: number;
	orientation: Orientation;
	row: number;
	col: number;
	cells: Coord[];
}

/** An in-progress drag of a ship, from the dock or lifted off the board. */
interface DragState {
	name: ShipName;
	size: number;
	orientation: Orientation;
	from: 'dock' | 'placed';
	/** The lifted ship, so an invalid drop / a tap-to-rotate can restore or rotate it. */
	original?: PlacedShip;
	startX: number;
	startY: number;
	/** Set once the pointer moves past the tap threshold — distinguishes a drag from a rotate tap. */
	moved: boolean;
}

@Component({
	selector: 'gg-battleship-game',
	standalone: true,
	imports: [IonButton, PlayerAvatarComponent],
	templateUrl: './battleship-game.component.html',
	styleUrl: './battleship-game.component.scss',
})
export class BattleshipGameComponent implements GameComponent<BattleshipGameState> {
	public readonly gameState = input.required<BattleshipGameState | null>();
	public readonly loading = input.required<boolean>();
	public readonly error = input.required<string | null>();
	public readonly myPlayFabId = input.required<string | null>();
	public readonly gameAction = output<{ action: string; data?: unknown }>();
	public readonly back = output<void>();
	public readonly playAgain = output<void>();

	protected readonly AXIS = AXIS;
	protected readonly COLUMN_LABELS = COLUMN_LABELS;
	protected readonly ROW_LABELS = ROW_LABELS;
	protected readonly fleetSize = FLEET_ROSTER.length;

	// ── Players & phase ─────────────────────────────────────────────────────────

	protected readonly me = computed<BattleshipPlayer | null>(() => {
		const gs = this.gameState();
		const id = this.myPlayFabId();
		return gs?.players.find(p => p.id === id) ?? null;
	});

	protected readonly opponent = computed<BattleshipPlayer | null>(() => {
		const gs = this.gameState();
		const id = this.myPlayFabId();
		return gs?.players.find(p => p.id !== id) ?? null;
	});

	protected readonly iAmReady = computed(() => this.me()?.ready ?? false);

	protected readonly isMyTurn = computed(() => {
		const gs = this.gameState();
		if (!gs || gs.gamePhase !== 'playing') return false;
		return gs.players[gs.currentPlayerIndex]?.id === this.myPlayFabId();
	});

	// ── Placement (local, client-side until confirmed) ───────────────────────────
	// Ships are dragged from the dock onto the grid (pointer events, so it works on mouse and touch);
	// tapping a placed ship rotates it in place. Nothing is sent to the server until Confirm.

	protected readonly placed = signal<PlacedShip[]>([]);
	private readonly dragging = signal<DragState | null>(null);
	private readonly dragCell = signal<Coord | null>(null);

	private readonly placedNames = computed(() => new Set(this.placed().map(s => s.name)));

	/** Cells occupied by placed ships (a lifted ship is removed from `placed`, so it's already excluded). */
	private readonly occupied = computed(() => {
		const set = new Set<string>();
		for (const ship of this.placed()) for (const c of ship.cells) set.add(coordKey(c.row, c.col));
		return set;
	});

	/** Ships still to place — the draggable tokens shown in the dock. */
	protected readonly dockShips = computed(() => FLEET_ROSTER.filter(f => !this.placedNames().has(f.name)));

	protected readonly allPlaced = computed(() => this.placed().length === FLEET_ROSTER.length);

	/** Cells the dragged ship would occupy at the hovered anchor, and whether that drop is legal. */
	private readonly previewCells = computed<Coord[]>(() => {
		const d = this.dragging();
		const cell = this.dragCell();
		return d && cell ? shipCells(cell.row, cell.col, d.size, d.orientation) : [];
	});
	private readonly previewValid = computed(() => this.previewCells().length > 0 && canPlace(this.previewCells(), this.occupied()));
	private readonly previewSet = computed(() => new Set(this.previewCells().map(c => coordKey(c.row, c.col))));

	protected setupCellClass(row: number, col: number): string {
		const key = coordKey(row, col);
		if (this.previewSet().has(key)) return this.previewValid() ? 'bs-cell bs-cell-preview-ok' : 'bs-cell bs-cell-preview-bad';
		return this.occupied().has(key) ? 'bs-cell bs-cell-ship' : 'bs-cell bs-cell-water';
	}

	private shipAt(row: number, col: number): PlacedShip | null {
		const key = coordKey(row, col);
		return this.placed().find(s => s.cells.some(c => coordKey(c.row, c.col) === key)) ?? null;
	}

	/** Begin dragging a fresh ship out of the dock. */
	protected startDragDock(name: ShipName, size: number, event: PointerEvent): void {
		if (this.iAmReady()) return;
		event.preventDefault();
		this.dragging.set({ name, size, orientation: 'horizontal', from: 'dock', startX: event.clientX, startY: event.clientY, moved: false });
		this.dragCell.set(null);
	}

	/** Pointer-down on the grid: lift the ship under it (to move or, on a tap, rotate). Empty water is a no-op. */
	protected onSetupPointerDown(row: number, col: number, event: PointerEvent): void {
		if (this.iAmReady()) return;
		const ship = this.shipAt(row, col);
		if (!ship) return;
		event.preventDefault();
		this.placed.update(list => list.filter(s => s.name !== ship.name));
		this.dragging.set({ name: ship.name, size: ship.size, orientation: ship.orientation, from: 'placed', original: ship, startX: event.clientX, startY: event.clientY, moved: false });
		this.dragCell.set(null);
	}

	@HostListener('document:pointermove', ['$event'])
	protected onPointerMove(event: PointerEvent): void {
		const d = this.dragging();
		if (!d) return;
		if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 6) {
			this.dragging.set({ ...d, moved: true });
		}
		this.dragCell.set(this.cellFromPoint(event.clientX, event.clientY));
	}

	@HostListener('document:pointerup')
	protected onPointerUp(): void {
		const d = this.dragging();
		if (!d) return;
		const cell = this.dragCell();
		this.dragging.set(null);
		this.dragCell.set(null);

		// A tap (no real movement) on a placed ship rotates it in place.
		if (d.from === 'placed' && d.original && !d.moved) {
			this.rotate(d.original);
			return;
		}
		// Otherwise drop at the hovered cell if the ship fits there.
		if (cell) {
			const cells = shipCells(cell.row, cell.col, d.size, d.orientation);
			if (canPlace(cells, this.occupied())) {
				this.placed.update(list => [...list, { name: d.name, size: d.size, orientation: d.orientation, row: cell.row, col: cell.col, cells }]);
				return;
			}
		}
		// Invalid or off-grid: a lifted ship returns to where it was (a dock ship just stays in the dock).
		if (d.from === 'placed' && d.original) this.placed.update(list => [...list, d.original!]);
	}

	@HostListener('document:pointercancel')
	protected onPointerCancel(): void {
		const d = this.dragging();
		if (!d) return;
		this.dragging.set(null);
		this.dragCell.set(null);
		if (d.from === 'placed' && d.original) this.placed.update(list => [...list, d.original!]);
	}

	private rotate(ship: PlacedShip): void {
		const orientation: Orientation = ship.orientation === 'horizontal' ? 'vertical' : 'horizontal';
		const cells = shipCells(ship.row, ship.col, ship.size, orientation);
		// `ship` was lifted on pointer-down, so `occupied` already excludes it.
		const rotated = canPlace(cells, this.occupied()) ? { ...ship, orientation, cells } : ship;
		this.placed.update(list => [...list, rotated]);
	}

	private cellFromPoint(x: number, y: number): Coord | null {
		const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-bs-row]');
		if (!cell) return null;
		const row = Number(cell.dataset['bsRow']);
		const col = Number(cell.dataset['bsCol']);
		return Number.isNaN(row) || Number.isNaN(col) ? null : { row, col };
	}

	protected clearPlacement(): void {
		this.placed.set([]);
		this.dragging.set(null);
		this.dragCell.set(null);
	}

	protected confirmPlacement(): void {
		if (!this.allPlaced() || this.loading()) return;
		const ships: Ship[] = this.placed().map(s => ({ name: s.name, size: s.size, cells: s.cells }));
		this.gameAction.emit({ action: 'place', data: { ships } });
	}

	// ── Playing: board overlays ───────────────────────────────────────────────────

	/** My own ship cells. */
	private readonly myShipCells = computed(() => {
		const set = new Set<string>();
		for (const ship of this.me()?.ships ?? []) for (const c of ship.cells) set.add(coordKey(c.row, c.col));
		return set;
	});

	/** The opponent's shots at my board (row,col → hit/miss). */
	private readonly incomingByCell = computed(() => {
		const map = new Map<string, 'hit' | 'miss'>();
		for (const s of this.me()?.incomingShots ?? []) map.set(coordKey(s.row, s.col), s.result);
		return map;
	});

	/** My shots at the opponent's board (row,col → hit/miss). */
	private readonly outgoingByCell = computed(() => {
		const map = new Map<string, 'hit' | 'miss'>();
		for (const s of this.opponent()?.incomingShots ?? []) map.set(coordKey(s.row, s.col), s.result);
		return map;
	});

	/** Cells of the opponent's sunk ships (public state reveals only sunk ships). */
	private readonly sunkCells = computed(() => {
		const set = new Set<string>();
		for (const ship of this.opponent()?.ships ?? []) for (const c of ship.cells) set.add(coordKey(c.row, c.col));
		return set;
	});

	/** My board during play: my ships plus the opponent's hit/miss overlay. */
	protected myCellClass(row: number, col: number): string {
		const key = coordKey(row, col);
		const shot = this.incomingByCell().get(key);
		const isShip = this.myShipCells().has(key);
		if (isShip) return shot === 'hit' ? 'bs-cell bs-cell-ship bs-cell-hit' : 'bs-cell bs-cell-ship';
		if (shot === 'miss') return 'bs-cell bs-cell-miss';
		return 'bs-cell bs-cell-water';
	}

	/** The opponent's board: where I've fired (hit/miss/sunk); un-fired water is a target. */
	protected opponentCellClass(row: number, col: number): string {
		const key = coordKey(row, col);
		if (this.sunkCells().has(key)) return 'bs-cell bs-cell-sunk';
		const shot = this.outgoingByCell().get(key);
		if (shot === 'hit') return 'bs-cell bs-cell-hit';
		if (shot === 'miss') return 'bs-cell bs-cell-miss';
		return this.isMyTurn() ? 'bs-cell bs-cell-water bs-cell-target' : 'bs-cell bs-cell-water';
	}

	protected canFireAt(row: number, col: number): boolean {
		return this.isMyTurn() && !this.loading() && !this.outgoingByCell().has(coordKey(row, col));
	}

	protected fireAt(row: number, col: number): void {
		if (!this.canFireAt(row, col)) return;
		this.gameAction.emit({ action: 'fire', data: { row, col } });
	}

	// ── Feedback & fleet status ─────────────────────────────────────────────────

	/** How many of the opponent's ships I've sunk (public state reveals only sunk ships). */
	protected readonly enemyShipsSunk = computed(() => this.opponent()?.ships.length ?? 0);

	/** How many of my ships have been sunk. */
	protected readonly myShipsSunk = computed(() => {
		const me = this.me();
		if (!me) return 0;
		return me.ships.filter(s => isShipSunk(s, me.incomingShots)).length;
	});

	protected readonly lastShotMessage = computed<string | null>(() => {
		const ls = this.gameState()?.lastShot;
		if (!ls) return null;
		const mine = ls.by === this.myPlayFabId();
		const who = mine ? 'You' : (this.opponent()?.name ?? 'Opponent');
		const target = `${COLUMN_LABELS[ls.col]}${ROW_LABELS[ls.row]}`;
		if (ls.sunk) return `${who} sank the ${ls.sunk} at ${target}!`;
		return `${who} ${ls.result === 'hit' ? 'hit' : 'missed'} at ${target}`;
	});
}
