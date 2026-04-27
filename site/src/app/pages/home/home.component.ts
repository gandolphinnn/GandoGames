import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { GAME_REGISTRY } from '../../game-registry';

@Component({
	selector: 'gg-home',
	imports: [RouterLink, RouterOutlet],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
})
export class HomeComponent {
}
