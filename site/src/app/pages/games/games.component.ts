import { Component, computed, inject } from '@angular/core';
import { GameId } from '@gandogames/shared/dto';
import { UrlService } from '@gandogames/services';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { BASE_IMPORTS } from '@gandogames/lib/ion-imports';
import { RefreshableContentComponent } from '@gandogames/components';

@Component({
	selector: 'gg-games',
	host: { class: 'ion-page' },
	imports: [...BASE_IMPORTS, RefreshableContentComponent],
	templateUrl: './games.component.html',
	styleUrl: './games.component.scss',
})
export class GamesComponent {
	private url = inject(UrlService)
	public games = Object.values(GAME_REGISTRY)

	public async refreshFn() {
		await this.fetchGames();
	};

	public readonly filteredRooms = computed(() => {
	});

	public async fetchGames() {

	}

	public play(gameId: GameId) {
		const game = GAME_REGISTRY[gameId];
		switch(game.category) {
			case 'single': return this.url.buildState('play_game', { gameId: gameId }).navigate();
			case 'room': return this.url.buildState('rooms_list', { gameId: gameId }).navigate();
		}
	}
}
