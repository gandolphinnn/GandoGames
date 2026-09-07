import { Component } from '@angular/core';
import { BASE_IMPORTS } from '@gandogames/lib/ion-imports';

@Component({
	selector: 'gg-games',
	host: { class: 'ion-page' },
	imports: [...BASE_IMPORTS],
	templateUrl: './games.component.html',
	styleUrl: './games.component.scss',
})
export class GamesComponent {
}
