import { Component, computed, input, output } from '@angular/core';
import { MorraGameState } from '@gandogames/common/morra';
import { IonButton } from '@ionic/angular/standalone';
import { PlayerChipComponent, type PlayerChipData } from '@gandogames/lib/common/player-chip';
import { HAND_LABEL, HANDS, INITIAL_LIVES } from './morra.models';
import type { Hand } from './morra.models';
import { GameComponent } from '@gandogames/lib/game-registry';

@Component({
	selector: 'gg-morra-game',
	standalone: true,
	imports: [PlayerChipComponent, IonButton],
	templateUrl: './morra-game.component.html',
	styleUrl: './morra-game.component.scss',
})
export class MorraGameComponent implements GameComponent<MorraGameState> {
	public readonly gameState = input.required<MorraGameState | null>();
	public readonly loading = input.required<boolean>();
	public readonly error = input.required<string | null>();
	public readonly myPlayFabId = input.required<string | null>();
	public readonly gameAction = output<{ action: string; data?: unknown }>();
	public readonly back = output<void>();
	public readonly playAgain = output<void>();

	protected readonly HANDS = HANDS;
	protected readonly HAND_LABEL = HAND_LABEL;
	protected readonly livesRange = Array.from({ length: INITIAL_LIVES }, (_, i) => i);

	protected readonly playerChips = computed((): PlayerChipData[] => {
		const gs = this.gameState();
		if (!gs) return [];
		return gs.players.map(p => ({
			id: p.id,
			name: p.name,
			lives: p.lives,
			highlight: gs.gamePhase === 'picking' && p.hasPicked,
			statusText: gs.gamePhase === 'picking' ? (p.hasPicked ? 'Ready' : '…') : undefined,
		}));
	});

	protected readonly myPlayer = computed(() => {
		const gs = this.gameState();
		const me = this.myPlayFabId();
		if (!gs || !me) return null;
		return gs.players.find(p => p.id === me) ?? null;
	});

	protected readonly hasAlreadyPicked = computed(() => this.myPlayer()?.hasPicked ?? false);

	protected readonly pickProgress = computed(() => {
		const gs = this.gameState();
		if (!gs) return null;
		const alive = gs.players.filter(p => p.lives > 0).length;
		const picked = gs.players.filter(p => p.hasPicked && p.lives > 0).length;
		return { picked, alive };
	});

	protected isLoser(playFabId: string): boolean {
		return this.gameState()?.result?.losers.includes(playFabId) ?? false;
	}

	protected pick(hand: Hand): void { this.gameAction.emit({ action: 'pick', data: { hand } }); }
	protected nextRound(): void { this.gameAction.emit({ action: 'next-round' }); }
}
