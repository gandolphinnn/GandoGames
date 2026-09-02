import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { RoomData } from '@gandogames/shared/dto';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { BASE_IMPORTS } from '@gandogames/lib/ion-imports';
import { roomAccessOption } from '@gandogames/lib/room-access';
import { UrlService, RoomService, UserService, SignalRService, ToastService } from '@gandogames/services';
import { ChatComponent, RefreshableContentComponent, RoomAccessModalComponent } from '@gandogames/components';
import { RoomLobbyComponent } from './lobby/room-lobby.component';
import { RoomGameComponent } from './game/room-game.component';

/**
 * Room shell: owns room loading/state and renders the header, chat and refreshable
 * content area once. Delegates the body to the lobby or the game by room phase.
 */
@Component({
	selector: 'gg-room',
	host: { class: 'ion-page' },
	imports: [...BASE_IMPORTS, ChatComponent, RefreshableContentComponent, RoomAccessModalComponent, RoomGameComponent, RoomLobbyComponent, RouterLink],
	templateUrl: './room.component.html',
	styleUrl: './room.component.scss',
})
export class RoomComponent implements OnInit {
	private readonly urlService = inject(UrlService);
	private readonly roomService = inject(RoomService);
	private readonly auth = inject(UserService);
	private readonly signalR = inject(SignalRService);
	private readonly toast = inject(ToastService);
	private readonly translate = inject(TranslateService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly playBranch = this.urlService.get('play');
	public readonly roomId = computed(() => this.playBranch.currentVariables().roomId ?? '');
	public readonly room = signal<RoomData | null>(null);
	public readonly copied = signal(false);
	public readonly showAccessModal = signal(false);

	/** Icon + label describing the room's current access policy, for the toolbar action. */
	public readonly accessBadge = computed(() => roomAccessOption(this.room()?.access ?? 'public'));

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

	constructor() {
		// Reload whenever the roomId in the URL changes; it becomes '' while navigating away.
		effect(() => {
			if (!this.roomId()) return;
			this.room.set(null);
			void this.loadRoom();
		});
	}

	public ngOnInit(): void {
		this.subscribeToRoomEvents();
	}

	private async loadRoom(): Promise<void> {
		try {
			const room = await this.roomService.getRoom(this.roomId());
			if (room.kickedPlayers?.includes(this.myId())) {
				void this.urlService.get('play').navigate();
				return;
			}
			this.room.set(room);
			if (room.phase === 'playing' && !room.players.some(p => p.id === this.myId())) {
				void this.urlService.get('play').navigate();
			}
		} catch {
			void this.urlService.get('play').navigate();
		}
	}

	private subscribeToRoomEvents(): void {
		this.signalR.events.roomUpsert.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((room) => {
			if (room.id !== this.roomId()) return;
			if (room.kickedPlayers?.includes(this.myId())) {
				this.toast.show(this.translate.instant('ROOM.KICKED') as string, 'warning');
				void this.urlService.get('play').navigate();
				return;
			}
			this.room.set(room);
		});
		this.signalR.events.roomDeleted.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((roomId) => {
			if (roomId !== this.roomId()) return;
			if (!this.isHost()) {
				this.toast.warning(this.translate.instant('ROOM.HOST_CLOSED') as string);
			}
			void this.urlService.get('play').navigate();
		});
	}

	public async leave(): Promise<void> {
		const confirmed = await this.toast.yesNo(this.translate.instant('ROOM.LEAVE_CONFIRM') as string);
		if (!confirmed) return;

		await this.roomService.leaveRoom(this.roomId());
	}

	public async closeRoom(): Promise<void> {
		const confirmed = await this.toast.yesNo(this.translate.instant('ROOM.CLOSE_CONFIRM') as string);
		if (!confirmed) return;

		await this.roomService.deleteRoom(this.roomId());
		void this.urlService.get('play').navigate();
	}

	public async copyCode(): Promise<void> {
		await navigator.clipboard.writeText(window.location.href);
		this.copied.set(true);
		setTimeout(() => this.copied.set(false), 2000);
	}

	public openAccess(): void {
		this.showAccessModal.set(true);
	}
}
