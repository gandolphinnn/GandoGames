import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/standalone';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { RoomService } from '@gandogames/services/room.service';

@Component({
	selector: 'gg-room-new',
	standalone: true,
	imports: [IonButton],
	templateUrl: './room-new.component.html',
	styleUrl: './room-new.component.scss',
})
export class RoomNewComponent {
	private readonly router = inject(Router);
	private readonly roomService = inject(RoomService);

	public readonly allGames = GAME_REGISTRY;
	public readonly selectedGameId = signal<string>(GAME_REGISTRY[0]?.id ?? '');
	public readonly loading = signal(false);
	public readonly error = signal('');

	public select(id: string): void {
		this.selectedGameId.set(id);
	}

	public async create(): Promise<void> {
		if (!this.selectedGameId()) return;
		try {
			this.loading.set(true);
			this.error.set('');
			const room = await this.roomService.createRoom(this.selectedGameId() as any);
			void this.router.navigate(['/play', room.id]);
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	public cancel(): void {
		void this.router.navigate(['/play']);
	}
}
