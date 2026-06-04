import { Component, computed, input, output } from '@angular/core';
import { PankovGameState } from '@gandogames/shared/pankov';
import { IonButton } from '@ionic/angular/standalone';
import { PlayerChipComponent, type PlayerChipData } from '@gandogames/lib/common/player-chip';
import { formatValue, getRank, INITIAL_LIVES, ROLL_VALUES } from './pankov.models';
import type { RollValue } from './pankov.models';
import { GameComponent } from '@gandogames/lib/game-registry';

@Component({
	selector: 'gg-pankov-game',
	standalone: true,
	imports: [PlayerChipComponent, IonButton],
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
	protected readonly livesRange = Array.from({ length: INITIAL_LIVES }, (_, i) => i);

	protected readonly playerChips = computed((): PlayerChipData[] => {
		const gs = this.gameState();
		if (!gs) return [];
		const isActive = gs.gamePhase !== 'result' && gs.gamePhase !== 'game-over';
		const currentId = gs.players[gs.currentPlayerIndex]?.id;
		return gs.players.map(p => ({
			id: p.id,
			name: p.name,
			lives: p.lives,
			highlight: isActive && p.id === currentId,
		}));
	});

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
