import { computed, Injectable, signal } from '@angular/core';

import { CallResult, GamePhase, getRank, INITIAL_LIVES, Player, rollToValue } from './pankov.models';

interface PankovState {
	players: Player[];
	currentIndex: number;
	previousIndex: number | null;
	previousDeclaration: number | null;
	previousActualValue: number | null;
	currentDice: [number, number] | null;
	phase: GamePhase;
	callResult: CallResult | null;
}

const BLANK: PankovState = {
	players: [],
	currentIndex: 0,
	previousIndex: null,
	previousDeclaration: null,
	previousActualValue: null,
	currentDice: null,
	phase: 'setup',
	callResult: null,
};

@Injectable()
export class PankovService {
	private _state = signal<PankovState>(BLANK);

	readonly phase = computed(() => this._state().phase);
	readonly players = computed(() => this._state().players);
	readonly currentPlayerIndex = computed(() => this._state().currentIndex);

	readonly currentPlayer = computed(() => {
		const s = this._state();
		return s.players[s.currentIndex] ?? null;
	});

	/** The next alive player — only meaningful during the 'passing' phase. */
	readonly nextPlayer = computed(() => {
		const s = this._state();
		if (s.phase !== 'passing') return null;
		return s.players[nextAlive(s.players, s.currentIndex)];
	});

	readonly previousPlayer = computed(() => {
		const s = this._state();
		return s.previousIndex !== null ? s.players[s.previousIndex] : null;
	});

	readonly currentDice = computed(() => this._state().currentDice);

	/** The computed Pankov value for the current dice roll. */
	readonly currentRollValue = computed(() => {
		const d = this._state().currentDice;
		return d ? rollToValue(d[0], d[1]) : null;
	});

	readonly previousDeclaration = computed(() => this._state().previousDeclaration);
	readonly previousActualValue = computed(() => this._state().previousActualValue);
	readonly callResult = computed(() => this._state().callResult);

	/** True when Pankov (21) was declared — no higher value exists, must call false. */
	readonly mustCallFalse = computed(() => this._state().previousDeclaration === 21);

	readonly winner = computed(() => {
		const s = this._state();
		if (s.phase !== 'game-over') return null;
		return s.players.find((p) => p.lives > 0) ?? null;
	});

	readonly loser = computed(() => {
		const s = this._state();
		if (!s.callResult) return null;
		return s.players[s.callResult.loserIndex] ?? null;
	});

	// ── Actions ────────────────────────────────────────────────────────────────

	startGame(names: string[]): void {
		this._state.set({
			...BLANK,
			players: names.map((name) => ({ name: name.trim(), lives: INITIAL_LIVES })),
			phase: 'turn-start',
		});
	}

	roll(): void {
		this._state.update((s) => ({
			...s,
			currentDice: [rollDie(), rollDie()],
			phase: 'rolled',
		}));
	}

	declare(value: number): void {
		this._state.update((s) => ({
			...s,
			previousDeclaration: value,
			previousActualValue: rollToValue(s.currentDice![0], s.currentDice![1]),
			previousIndex: s.currentIndex,
			currentDice: null,
			phase: 'passing',
		}));
	}

	/** Advance to the next player after the passing screen. */
	advanceTurn(): void {
		this._state.update((s) => ({
			...s,
			currentIndex: nextAlive(s.players, s.currentIndex),
			phase: 'turn-start',
		}));
	}

	callFalse(): void {
		this._state.update((s) => {
			// Lying = declared a rank higher than what was actually rolled
			const wasLying = getRank(s.previousActualValue!) < getRank(s.previousDeclaration!);
			const loserIndex = wasLying ? s.previousIndex! : s.currentIndex;
			return { ...s, callResult: { wasLying, loserIndex }, phase: 'reveal' };
		});
	}

	/** Apply the life penalty shown on the reveal screen and continue. */
	applyResult(): void {
		this._state.update((s) => {
			const players = s.players.map((p, i) =>
				i === s.callResult!.loserIndex ? { ...p, lives: p.lives - 1 } : p,
			);

			if (players.filter((p) => p.lives > 0).length <= 1) {
				return { ...s, players, phase: 'game-over' };
			}

			// The loser starts the next round; if eliminated, skip to next alive.
			let nextIndex = s.callResult!.loserIndex;
			if (players[nextIndex].lives <= 0) {
				nextIndex = nextAlive(players, nextIndex);
			}

			return {
				...s,
				players,
				currentIndex: nextIndex,
				previousIndex: null,
				previousDeclaration: null,
				previousActualValue: null,
				currentDice: null,
				callResult: null,
				phase: 'turn-start',
			};
		});
	}

	reset(): void {
		this._state.set(BLANK);
	}
}

function rollDie(): number {
	return Math.floor(Math.random() * 6) + 1;
}

function nextAlive(players: Player[], fromIndex: number): number {
	const n = players.length;
	let i = (fromIndex + 1) % n;
	while (players[i].lives <= 0) {
		i = (i + 1) % n;
	}
	return i;
}
