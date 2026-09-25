import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API, GameId, GameState } from '@gandogames/shared/dto';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { BASE_IMPORTS } from '@gandogames/lib/ion-imports';
import { BackendService, GameService, UrlService } from '@gandogames/services';
import { GameSettingsModalComponent, GameShellComponent, RefreshableContentComponent } from '@gandogames/components';

@Component({
	selector: 'gg-play',
	imports: [...BASE_IMPORTS, RefreshableContentComponent, GameShellComponent, GameSettingsModalComponent, RouterLink],
	templateUrl: './play.component.html',
	styleUrl: './play.component.scss',
})
export class PlayComponent {
	private readonly urlService = inject(UrlService);
	private readonly gameService = inject(GameService);

	public readonly gameId = computed(() => this.urlService.current().segments['game'] as GameId ?? '');
	public readonly descriptor = computed(() => GAME_REGISTRY[this.gameId()] );
	public readonly isPlaying = computed(() => this.gameState().phase == 'playing');
	public readonly gameState = signal<GameState>(null!);

	public readonly showSettingsModal = signal(false);

	public async refreshFn() {

	}

	public async fetchGame() {
		const gameState = await this.gameService.getGameState(this.gameId());
		if (!gameState) {
			throw new Error();
		}
		this.gameState.set(gameState);
		return gameState;
	}
}
