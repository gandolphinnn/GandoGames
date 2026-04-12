import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
	selector: 'gg-play',
	imports: [RouterOutlet],
	templateUrl: './play.component.html',
	styleUrl: './play.component.scss',
})
export class PlayComponent implements OnInit {
	ngOnInit(): void {
		//todo pass to the service handling the current game the game id, the user profile and other data.
	}
}
