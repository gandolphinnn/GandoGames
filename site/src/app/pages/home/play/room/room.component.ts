import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoomData } from '@gandogames/shared/dto';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { ION_IMPORTS } from '@gandogames/lib/ion-imports';
import { RoomService } from '@gandogames/services/room.service';
import { UserService } from '@gandogames/services/user.service';
import { SignalRService } from '@gandogames/services/signalr.service';
import { ToastService } from '@gandogames/services/toast.service';
import { ChatComponent, RefreshableContentComponent } from '@gandogames/components';
import { RoomLobbyComponent } from './lobby/room-lobby.component';
import { RoomGameComponent } from './game/room-game.component';

/**
 * Room shell: owns room loading/state and renders the header, chat and refreshable
 * content area once. Delegates the body to the lobby or the game by room phase.
 */
@Component({
	selector: 'gg-room',
	host: { class: 'ion-page' },
	imports: [...ION_IMPORTS, ChatComponent, RefreshableContentComponent, RoomGameComponent, RoomLobbyComponent, RouterLink],
	templateUrl: './room.component.html',
	styleUrl: './room.component.scss',
})
export class RoomComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly roomService = inject(RoomService);
	private readonly auth = inject(UserService);
	private readonly signalR = inject(SignalRService);
	private readonly toast = inject(ToastService);
	private readonly destroyRef = inject(DestroyRef);

	public readonly roomId = signal('');
	public readonly room = signal<RoomData | null>(null);
	public readonly copied = signal(false);

	public readonly myId = computed(() => this.auth.user()?.player.id ?? '');
	public readonly isHost = computed(() => this.room()?.hostId === this.myId());
	public readonly isInRoom = computed(() => this.room()?.players.some((p) => p.id === this.myId()) ?? false);
	public readonly isPlaying = computed(() => this.room()?.phase === 'playing');
	public readonly gameInfo = computed(() => {
		const g = this.room()?.game;
		return g ? GAME_REGISTRY[g] : undefined;
	});

	public readonly refreshFn = computed(() =>
		this.isPlaying()
			? undefined
			: async () => { await this.loadRoom(); }
	);

	public ngOnInit(): void {
		this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			this.roomId.set(params.get('roomId') ?? '');
			this.room.set(null);
			void this.loadRoom();
		});
		this.subscribeToRoomEvents();
	}

	private async loadRoom(): Promise<void> {
		try {
			const room = await this.roomService.getRoom(this.roomId());
			if (room.kickedPlayers?.includes(this.myId())) {
				void this.router.navigate(['/play']);
				return;
			}
			this.room.set(room);
			if (room.phase === 'playing' && !room.players.some(p => p.id === this.myId())) {
				void this.router.navigate(['/play']);
			}
		} catch {
			void this.router.navigate(['/play']);
		}
	}

	private subscribeToRoomEvents(): void {
		this.signalR.events.roomUpsert.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((room) => {
			if (room.id !== this.roomId()) return;
			if (room.kickedPlayers?.includes(this.myId())) {
				this.toast.show('You have been kicked from the room.', 'warning');
				void this.router.navigate(['/play']);
				return;
			}
			this.room.set(room);
		});
		this.signalR.events.roomDeleted.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((roomId) => {
			if (roomId !== this.roomId()) return;
			if (!this.isHost()) {
				this.toast.warning('The host has closed the room.');
			}
			void this.router.navigate(['/play']);
		});
	}

	public async leave(): Promise<void> {
		const confirmed = await this.toast.yesNo('Are you sure you want to leave the room?');
		if (!confirmed) return;

		await this.roomService.leaveRoom(this.roomId());
		void this.router.navigate(['/play']);
	}

	public async closeRoom(): Promise<void> {
		const confirmed = await this.toast.yesNo('Close the room for everyone?');
		if (!confirmed) return;

		await this.roomService.deleteRoom(this.roomId());
		void this.router.navigate(['/play']);
	}

	public async copyCode(): Promise<void> {
		await navigator.clipboard.writeText(window.location.href);
		this.copied.set(true);
		setTimeout(() => this.copied.set(false), 2000);
	}
}
