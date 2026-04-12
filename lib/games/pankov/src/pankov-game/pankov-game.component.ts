import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DiceComponent } from '../../../../common/dice/dice.component';
import { formatValue, getRank, INITIAL_LIVES, MAX_PLAYERS, MIN_PLAYERS, ROLL_VALUES } from '../pankov.models';
import { PankovService } from '../pankov.service';

@Component({
	selector: 'gg-pankov-game',
	standalone: true,
	imports: [RouterLink, DiceComponent],
	providers: [PankovService],
	templateUrl: './pankov-game.component.html',
	styleUrl: './pankov-game.component.sass',
})
export class PankovGameComponent {
	protected readonly game = inject(PankovService);

	protected readonly allValues = ROLL_VALUES;
	protected readonly livesRange = Array.from({ length: INITIAL_LIVES }, (_, i) => i);
	protected readonly MIN_PLAYERS = MIN_PLAYERS;
	protected readonly MAX_PLAYERS = MAX_PLAYERS;
	protected readonly formatValue = formatValue;

	// ── Setup state ────────────────────────────────────────────────────────────

	protected readonly playerNames = signal<string[]>(['', '']);

	protected readonly canStart = computed(
		() =>
			this.playerNames().length >= MIN_PLAYERS &&
			this.playerNames().every((n) => n.trim().length > 0),
	);

	protected updateName(index: number, value: string): void {
		this.playerNames.update((names) => {
			const next = [...names];
			next[index] = value;
			return next;
		});
	}

	protected addPlayer(): void {
		this.playerNames.update((names) => [...names, '']);
	}

	protected removePlayer(index: number): void {
		this.playerNames.update((names) => names.filter((_, i) => i !== index));
	}

	protected startGame(): void {
		this.game.startGame(this.playerNames());
	}

	// ── Helpers ────────────────────────────────────────────────────────────────

	/** True when the value can be legally declared (>= previous declaration). */
	protected isAvailable(val: number): boolean {
		const prev = this.game.previousDeclaration();
		if (prev === null) return true;
		return getRank(val) >= getRank(prev);
	}

	// ── Game actions ───────────────────────────────────────────────────────────

	protected roll(): void { this.game.roll(); }
	protected declare(value: number): void { this.game.declare(value); }
	protected advanceTurn(): void { this.game.advanceTurn(); }
	protected callFalse(): void { this.game.callFalse(); }
	protected applyResult(): void { this.game.applyResult(); }

	protected reset(): void {
		this.game.reset();
		this.playerNames.set(['', '']);
	}
}
