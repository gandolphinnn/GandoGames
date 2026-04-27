import { Component, computed, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DiceComponent } from '../../../../common/dice/dice.component';
import { formatValue, getRank, INITIAL_LIVES, ROLL_VALUES, rollToValue } from '../pankov.models';
import { PankovRoomService } from './pankov-room.service';

function rollDie(): number {
	return Math.floor(Math.random() * 6) + 1;
}

@Component({
	selector: 'gg-pankov-room-game',
	standalone: true,
	imports: [RouterLink, DiceComponent],
	templateUrl: './pankov-room-game.component.html',
	styleUrl: './pankov-room-game.component.scss',
})
export class PankovRoomGameComponent implements OnInit, OnDestroy {
	protected readonly room = inject(PankovRoomService);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);

	// Local state: dice rolled this turn (only visible to the rolling player)
	protected readonly rolledDice = signal<[number, number] | null>(null);
	protected readonly rolledValue = computed(() => {
		const d = this.rolledDice();
		return d ? rollToValue(d[0], d[1]) : null;
	});

	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);

	protected readonly livesRange = Array.from({ length: INITIAL_LIVES }, (_, i) => i);
	protected readonly formatValue = formatValue;
	protected readonly getRank = getRank;

	public readonly groupedValues: number[][] = (() => {
		const normals = ROLL_VALUES.filter((v) => v !== 21 && v % 11 !== 0);
		const byFirst = new Map<number, number[]>();
		for (const v of normals) {
			const key = Math.floor(v / 10);
			byFirst.set(key, [...(byFirst.get(key) ?? []), v]);
		}
		return [...byFirst.values(), ROLL_VALUES.filter((v) => v % 11 === 0) as unknown as number[], [21]];
	})();

	ngOnInit(): void {
		const roomId = this.route.snapshot.paramMap.get('roomId')!;
		if (this.room.roomId() !== roomId) {
			void this.room.loadRoom(roomId);
		}
		this.room.startPolling();
	}

	ngOnDestroy(): void {
		this.room.stopPolling();
	}

	protected isAvailable(val: number): boolean {
		const prev = this.room.state()?.gameState?.previousDeclaration ?? null;
		if (prev === null) return true;
		return getRank(val) >= getRank(prev);
	}

	// ── Actions ──────────────────────────────────────────────────────────────────

	protected roll(): void {
		this.rolledDice.set([rollDie(), rollDie()]);
	}

	protected async declare(value: number): Promise<void> {
		const dice = this.rolledDice()!;
		const actual = rollToValue(dice[0], dice[1]);
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.room.declare(value, actual);
			this.rolledDice.set(null);
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected async callFalse(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.room.callFalse();
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected async nextTurn(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.room.nextTurn();
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected async startGame(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.room.startRoom();
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected copyCode(): void {
		const code = this.room.roomId();
		if (code) void navigator.clipboard.writeText(code);
	}

	protected playAgain(): void {
		this.room.reset();
		this.router.navigate(['/play/pankov']);
	}
}
