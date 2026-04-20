import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_REGISTRY } from '../../game-registry';

@Component({
	selector: 'gg-home',
	imports: [RouterLink],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
})
export class HomeComponent {
	public readonly games = GAME_REGISTRY;
}
