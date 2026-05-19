import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
	gameControllerOutline, peopleOutline, personCircleOutline,
	gameController, people, personCircle,
} from 'ionicons/icons';

import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { DeviceService } from '@gandogames/services/device.service';
import { SignalRService } from '@gandogames/services/signalr.service';
import { ToastService } from '@gandogames/services/toast.service';

@Component({
	selector: 'gg-home',
	imports: [RouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
	private readonly signalR = inject(SignalRService);
	private readonly toast = inject(ToastService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	protected readonly device = inject(DeviceService);

	constructor() {
		addIcons({
			gameControllerOutline, peopleOutline, personCircleOutline,
			gameController, people, personCircle,
		});
	}

	public ngOnInit(): void {
		this.signalR.events.roomInvite
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(async ({ roomId, game }) => {
				const gameName = GAME_REGISTRY.find(g => g.id === game)?.name ?? game;
				const accepted = await this.toast.yesNo(`You've been invited to a ${gameName} game!`);
				if (accepted) void this.router.navigate(['/play', roomId]);
			});
	}
}
