import { Component, computed, DestroyRef, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoomData } from '@gandogames/common/api';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { AuthService } from '@gandogames/services/auth.service';
import { RoomService } from '@gandogames/services/room.service';
import { SignalRService } from '@gandogames/services/signalr.service';

@Component({
	selector: 'gg-room-detail',
	imports: [RouterLink],
	templateUrl: './room-detail.component.html',
	styleUrl: './room-detail.component.scss',
})
export class RoomDetailComponent implements OnInit, OnDestroy {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly roomService = inject(RoomService);
	private readonly auth = inject(AuthService);
	private readonly signalR = inject(SignalRService);
	private readonly destroyRef = inject(DestroyRef);

	private hasLeft = false;

	public readonly gameId = signal('');
	public readonly roomId = signal('');
	public readonly room = signal<RoomData | null>(null);
	public readonly error = signal('');
	public readonly loading = signal(false);
	public readonly copied = signal(false);

	public readonly myId = computed(() => this.auth.user()?.player.id ?? '');
	public readonly isHost = computed(() => this.room()?.hostId === this.myId());
	public readonly isInRoom = computed(() => this.room()?.players.some((p) => p.id === this.myId()) ?? false);
	public readonly gameName = computed(() => GAME_REGISTRY.find((g) => g.id === this.gameId())?.name ?? this.gameId());

	public readonly canJoin = computed(() => {
		const r = this.room();
		if (!r || r.phase !== 'waiting' || this.isInRoom()) return false;
		const maxPlayers = GAME_REGISTRY.find((g) => g.id === r.game)?.maxPlayers ?? 0;
		return r.players.length < maxPlayers;
	});

	public readonly canStart = computed(() => {
		const r = this.room();
		if (!r || !this.isHost() || r.phase !== 'waiting') return false;
		const game = GAME_REGISTRY.find((g) => g.id === r.game);
		if (!game) return false;
		return r.players.length >= game.minPlayers;
	});

	public ngOnDestroy(): void {
		if (!this.hasLeft && this.isInRoom()) {
			void this.roomService.leaveRoom(this.roomId());
		}
	}

	@HostListener('window:beforeunload')
	public onBeforeUnload(): void {
		if (!this.hasLeft && this.isInRoom()) {
			void this.roomService.leaveRoom(this.roomId());
		}
	}

	public ngOnInit(): void {
		this.gameId.set(this.route.snapshot.params['gameId']);
		this.roomId.set(this.route.snapshot.params['roomId']);
		this.loadRoom();
		this.subscribeToRoomEvents();
	}

	private async loadRoom(): Promise<void> {
		try {
			const room = await this.roomService.getRoom(this.roomId());
			this.room.set(room);
		} catch (e) {
			this.error.set((e as Error).message);
		}
	}

	private subscribeToRoomEvents(): void {
		this.signalR.events.roomUpsert.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((room) => {
			if (room.id === this.roomId()) {
				this.room.set(room);
			}
		});
		this.signalR.events.roomDeleted.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((roomId) => {
			if (roomId === this.roomId()) {
				void this.router.navigate(['/play']);
			}
		});
	}

	public async join(): Promise<void> {
		try {
			this.loading.set(true);
			this.error.set('');
			await this.roomService.joinRoom(this.roomId());
			await this.loadRoom();
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	public async start(): Promise<void> {
		try {
			this.loading.set(true);
			this.error.set('');
			await this.roomService.startRoom(this.roomId());
			await this.loadRoom();
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	public async leave(): Promise<void> {
		this.hasLeft = true;
		try {
			await this.roomService.leaveRoom(this.roomId());
			this.router.navigate(['/play']);
		} catch (e) {
			this.hasLeft = false;
			this.error.set((e as Error).message);
		}
	}

	public async copyCode(): Promise<void> {
		await navigator.clipboard.writeText(this.roomId());
		this.copied.set(true);
		setTimeout(() => this.copied.set(false), 2000);
	}
}
