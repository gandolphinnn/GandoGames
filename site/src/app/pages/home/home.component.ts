import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SignalRService } from '@gandogames/services/signalr.service';

@Component({
	selector: 'gg-home',
	imports: [RouterLink, RouterOutlet],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
})
export class HomeComponent {
	private readonly signalR = inject(SignalRService);
	public get status() {
		return this.signalR.connectionStatus || 'unknown';
	} 
}
