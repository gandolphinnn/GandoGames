import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
	selector: 'gg-play',
	imports: [RouterOutlet, RouterLink],
	templateUrl: './play.component.html',
	styleUrl: './play.component.scss',
})
export class PlayComponent {}
