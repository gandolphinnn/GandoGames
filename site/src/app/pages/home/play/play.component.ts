import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameName } from '@gandogames/shared/dto';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { BASE_IMPORTS } from '@gandogames/lib/ion-imports';
import { UrlService } from '@gandogames/services';
import { GameShellComponent, RefreshableContentComponent } from '@gandogames/components';

@Component({
	selector: 'gg-play',
	imports: [...BASE_IMPORTS, RefreshableContentComponent, GameShellComponent, RouterLink],
	templateUrl: './play.component.html',
	styleUrl: './play.component.scss',
})
export class PlayComponent {
	private readonly urlService = inject(UrlService);

	public readonly gameId = computed(() => this.urlService.current().segments['game'] as GameName ?? '');
	public readonly game = computed(() => GAME_REGISTRY[this.gameId()] );

	public async refreshFn() {

	}
}
