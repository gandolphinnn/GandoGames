import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomData } from '@gandogames/common/api';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { RoomService } from '@gandogames/services/room.service';

@Component({
	selector: 'gg-rooms',
	imports: [],
	templateUrl: './rooms.component.html',
	styleUrl: './rooms.component.scss',
})
export class RoomsComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly roomService = inject(RoomService);

	public readonly allGames = GAME_REGISTRY;
	public readonly activeGames = signal<string[]>([]);
	public readonly rooms = this.roomService.rooms;
	public readonly loading = signal(false);
	public readonly error = signal('');

	public readonly mode = signal<'browse' | 'create'>('browse');
	public readonly createGameId = signal('');
	public readonly createRoomName = signal('');

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

	public ngOnInit(): void {
		const paramGameId = this.route.snapshot.params['gameId'] as string | undefined;
		this.activeGames.set(paramGameId ? [paramGameId] : this.allGames.map((g) => g.id));
		if (paramGameId) this.createGameId.set(paramGameId);
		else this.createGameId.set(this.allGames[0]?.id ?? '');
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

	public async create(): Promise<void> {
		if (!this.createRoomName().trim() || !this.createGameId()) return;
		try {
			this.loading.set(true);
			this.error.set('');
			const room = await this.roomService.createRoom(this.createGameId() as any, this.createRoomName().trim());
			this.router.navigate(['/play', room.id]);
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	public navigateToRoom(room: RoomData): void {
		this.router.navigate(['/play', room.id]);
	}

	public setCreateRoomName(value: string): void {
		this.createRoomName.set(value);
	}

	public setCreateGameId(value: string): void {
		this.createGameId.set(value);
	}
}
