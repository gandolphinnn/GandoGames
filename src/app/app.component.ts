import { Component, signal } from '@angular/core';

@Component({
	selector: 'gg-app',
	imports: [],
	templateUrl: './app.component.html',
	styleUrl: './app.component.sass',
})
export class App {
	protected readonly title = signal('GandoGames');
}
