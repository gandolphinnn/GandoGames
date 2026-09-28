import { Component, inject, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MastermindGameState } from '@gandogames/shared/mastermind';
import { GameComponent } from '@gandogames/lib/game-registry';
import { GameTableComponent, GameTableSeatDef } from '@gandogames/lib/common/game-table';
import { PlayerAvatarComponent } from '@gandogames/components';

@Component({
	selector: 'gg-mastermind-game',
	standalone: true,
	imports: [IonButton, GameTableComponent, GameTableSeatDef, PlayerAvatarComponent, TranslatePipe],
	templateUrl: './mastermind-game.component.html',
	styleUrl: './mastermind-game.component.scss',
})
export class MastermindGameComponent implements GameComponent<MastermindGameState> {
	private readonly translate = inject(TranslateService);

	public readonly gameState = input.required<MastermindGameState | null>();
	public readonly loading = input.required<boolean>();
	public readonly myPlayFabId = input.required<string | null>();
	public readonly gameAction = output<{ action: string; data?: unknown }>();
	public readonly playAgain = output<void>();
}
