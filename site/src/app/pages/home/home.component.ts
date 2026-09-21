import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonRouterOutlet } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
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
	private readonly translate = inject(TranslateService);
	private readonly destroyRef = inject(DestroyRef);

	public ngOnInit(): void {
		this.signalR.events.roomInvite
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(async ({ roomId, gameId }) => {
				const gameTitle = this.translate.instant(GAME_REGISTRY[gameId]?.title);
				const msg = this.translate.instant('ROOM.INVITED', { game: gameTitle }) as string;
				const accepted = await this.toast.yesNo(msg).result;
				if (accepted) void this.urlService.buildState('play_room', { roomId: roomId }).navigate();
			});
	}
}
