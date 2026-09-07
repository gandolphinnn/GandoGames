import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RoomSummary } from '@gandogames/shared/dto';
import { BASE_IMPORTS } from '@gandogames/lib/ion-imports';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { roomAccessOption } from '@gandogames/lib/room-access';
import { RoomService, UrlService } from '@gandogames/services';
import { RefreshableContentComponent } from '@gandogames/components';

@Component({
	selector: 'gg-room-list',
	host: { class: 'ion-page' },
	imports: [...BASE_IMPORTS, RefreshableContentComponent],
	templateUrl: './room-list.component.html',
	styleUrl: './room-list.component.scss',
})
export class RoomListComponent implements OnInit {
	private readonly urlService = inject(UrlService);
	private readonly roomService = inject(RoomService);

	public readonly allGames = Object.values(GAME_REGISTRY);
	public readonly activeGames = signal<string[]>([]);
	public readonly browsableRooms = this.roomService.browsableRooms;
	public readonly myRooms = this.roomService.myRooms;
	public readonly loading = signal(false);
	public readonly joinCode = signal('');
	public readonly checkingCode = signal(false);

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

	public gameIcon(id: string): string {
		return this.allGames.find((g) => g.id === id)?.icon ?? '';
	}

	public maxPlayers(id: string): number {
		return this.allGames.find((g) => g.id === id)?.maxPlayers ?? 0;
	}

	public playerNames(room: RoomSummary): string {
		return room.players.map((p) => p.name).join(', ');
	}

	/** Access badge metadata for a room; null for plain public rooms (no badge shown). */
	public accessBadge(room: RoomSummary): { icon: string; label: string } | null {
		const access = room.access ?? 'public';
		return access === 'public' ? null : roomAccessOption(access);
	}

	public onCodeInput(event: Event): void {
		this.joinCode.set((event.target as HTMLInputElement).value);
	}

	/** Verify the room exists (and is reachable by this player) before navigating; a closed room the
	 *  player isn't in resolves as "not found" on the server, so it can't be entered by code either. */
	public async joinByCode(): Promise<void> {
		const code = this.joinCode().trim().toUpperCase();
		if (!code || this.checkingCode()) return;
		this.checkingCode.set(true);
		try {
			await this.roomService.getRoom(code);
			void this.urlService.buildState('play').navigate({ roomId: code });
		} finally {
			this.checkingCode.set(false);
		}
	}

	public ngOnInit(): void {
		this.activeGames.set(this.allGames.map((g) => g.id));
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
		void this.urlService.buildState('play').navigate({ roomId: room.id });
	}

	public goToCreate(): void {
		void this.urlService.buildState('play/new').navigate();
	}
}
