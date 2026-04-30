import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';

@Component({
	selector: 'gg-app',
	imports: [RouterLink, RouterOutlet],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class App {
	public readonly isLoggedIn = inject(AuthService).isLoggedIn;
}
