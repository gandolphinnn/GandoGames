import { Component, computed, inject } from '@angular/core';
import { GameName } from '@gandogames/shared/dto';
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

	public readonly refreshFn = async (): Promise<void> => {
		await this.fetchGames();
	};

	public readonly filteredRooms = computed(() => {
	});

	public async fetchGames() {

	}

	public play(gameName: GameName) {
		const game = GAME_REGISTRY[gameName];
		switch(game.category) {
			case 'single': return this.url.buildState('play_single', { game: game.name }).navigate();
			case 'local': return this.url.buildState('play_local', { game: game.name }).navigate();
			case 'room': return this.url.buildState('rooms_list', { game: game.name }).navigate();
		}
	}
}
