import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomData } from '@gandogames/common/api';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { RoomService } from '@gandogames/services/room.service';

@Component({
	selector: 'gg-room-list',
	host: { class: 'ion-page' },
	imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton, IonIcon],
	templateUrl: './room-list.component.html',
	styleUrl: './room-list.component.scss',
})
export class RoomListComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly roomService = inject(RoomService);

	public readonly allGames = GAME_REGISTRY;
	public readonly activeGames = signal<string[]>([]);
	public readonly rooms = this.roomService.rooms;
	public readonly loading = signal(false);
	public readonly error = signal('');

	public readonly filteredRooms = computed(() => {
		const active = this.activeGames();
		return this.rooms().filter((r) => active.includes(r.game));
	});

	public gameLabel(id: string): string {
		return this.allGames.find((g) => g.id === id)?.name ?? id;
	}

	public maxPlayers(id: string): number {
		return this.allGames.find((g) => g.id === id)?.maxPlayers ?? 0;
	}

	public playerNames(room: RoomData): string {
		return room.players.map((p) => p.name).join(', ');
	}

	public ngOnInit(): void {
		const paramGameId = this.route.snapshot.params['gameId'] as string | undefined;
		this.activeGames.set(paramGameId ? [paramGameId] : this.allGames.map((g) => g.id));
		void this.fetchRooms();
	}

	private async fetchRooms(): Promise<void> {
		try {
			this.loading.set(true);
			await this.roomService.loadRooms();
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	public toggleGame(id: string): void {
		const active = this.activeGames();
		if (active.includes(id)) {
			if (active.length === 1) return;
			this.activeGames.set(active.filter((g) => g !== id));
		} else {
			this.activeGames.set([...active, id]);
		}
	}

	public navigateToRoom(room: RoomData): void {
		void this.router.navigate(['/play', room.id]);
	}

	public goToCreate(): void {
		void this.router.navigate(['/play/new']);
	}
}
