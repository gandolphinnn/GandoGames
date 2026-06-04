import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { RoomService } from '@gandogames/services/room.service';

@Component({
	selector: 'gg-room-new',
	host: { class: 'ion-page' },
	imports: [IonHeader, IonToolbar, IonButtons, IonTitle, IonContent, IonButton, IonIcon, RouterLink],
	templateUrl: './room-new.component.html',
	styleUrl: './room-new.component.scss',
})
export class RoomNewComponent {
	private readonly router = inject(Router);
	private readonly roomService = inject(RoomService);

	public readonly allGames = Object.values(GAME_REGISTRY);
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
			void this.router.navigate(['/play', room.id]);
		} finally {
			this.loading.set(false);
		}
	}
}
