import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ION_IMPORTS } from '@gandogames/lib/ion-imports';
import { GAME_REGISTRY, playerCountLabel } from '@gandogames/lib/game-registry';
import { RoomService, UrlService } from '@gandogames/services';

@Component({
	selector: 'gg-room-new',
	host: { class: 'ion-page' },
	imports: [...ION_IMPORTS, RouterLink],
	templateUrl: './room-new.component.html',
	styleUrl: './room-new.component.scss',
})
export class RoomNewComponent {
	private readonly urlService = inject(UrlService);
	private readonly roomService = inject(RoomService);

	public readonly allGames = Object.values(GAME_REGISTRY);
	public readonly playerCountLabel = playerCountLabel;
	public readonly selectedGameId = signal<string>(this.allGames[0]?.id ?? '');
	public readonly loading = signal(false);

	public select(id: string): void {
		this.selectedGameId.set(id);
	}

	public async create(): Promise<void> {
		if (!this.selectedGameId()) return;
		try {
			this.loading.set(true);
			const room = await this.roomService.createRoom(this.selectedGameId() as any);
			void this.urlService.get('play').navigate({ roomId: room.id });
		} finally {
			this.loading.set(false);
		}
	}
}
