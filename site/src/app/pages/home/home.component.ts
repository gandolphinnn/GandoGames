import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonRouterOutlet } from '@ionic/angular/standalone';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { SignalRService, ToastService, UrlService } from '@gandogames/services';

@Component({
	selector: 'gg-home',
	host: { class: 'ion-page' },
	imports: [IonRouterOutlet],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
	private readonly signalR = inject(SignalRService);
	private readonly toast = inject(ToastService);
	private readonly urlService = inject(UrlService);
	private readonly destroyRef = inject(DestroyRef);

	public ngOnInit(): void {
		this.signalR.events.roomInvite
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(async ({ roomId, game }) => {
				const gameName = GAME_REGISTRY[game]?.name ?? game;
				const accepted = await this.toast.yesNo(`You've been invited to a ${gameName} game!`);
				if (accepted) void this.urlService.get('play').navigate({ roomId });
			});
	}
}
