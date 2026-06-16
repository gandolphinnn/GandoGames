import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomSummary } from '@gandogames/shared/dto';
import { ION_IMPORTS } from '@gandogames/lib/ion-imports';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { RoomService } from '@gandogames/services/room.service';
import { RefreshableContentComponent } from '@gandogames/components';

@Component({
	selector: 'gg-room-list',
	host: { class: 'ion-page' },
	imports: [...ION_IMPORTS, RefreshableContentComponent],
	templateUrl: './room-list.component.html',
	styleUrl: './room-list.component.scss',
})
export class RoomListComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly roomService = inject(RoomService);

	public readonly allGames = Object.values(GAME_REGISTRY);
	public readonly activeGames = signal<string[]>([]);
	public readonly browsableRooms = this.roomService.browsableRooms;
	public readonly loading = signal(false);

	public readonly filteredRooms = computed(() => {
		const active = this.activeGames();
		return this.browsableRooms().filter((r) => active.includes(r.game));
	});

	public readonly refreshFn = async (): Promise<void> => {
		await this.fetchRooms();
	};

	public gameLabel(id: string): string {
		return this.allGames.find((g) => g.id === id)?.name ?? id;
	}

	public maxPlayers(id: string): number {
		return this.allGames.find((g) => g.id === id)?.maxPlayers ?? 0;
	}

	public playerNames(room: RoomSummary): string {
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

	public navigateToRoom(room: RoomSummary): void {
		void this.router.navigate(['/play', room.id]);
	}

	public goToCreate(): void {
		void this.router.navigate(['/play/new']);
	}
}
