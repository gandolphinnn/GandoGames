import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GAME_REGISTRY, GameDescriptor } from '../../game-registry';

@Component({
	selector: 'gg-game-picker',
	imports: [RouterLink],
	templateUrl: './game-picker.component.html',
	styleUrl: './game-picker.component.scss',
})
export class GamePickerComponent {
	protected games: GameDescriptor[] = GAME_REGISTRY;
}
