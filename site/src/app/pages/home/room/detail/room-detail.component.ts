import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GamePlayer, RoomData } from '@gandogames/shared/api';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { UserService } from '@gandogames/services/user.service';
import { RoomService } from '@gandogames/services/room.service';
import { FriendService } from '@gandogames/services/friend.service';
import { SignalRService } from '@gandogames/services/signalr.service';
import { ToastService } from '@gandogames/services/toast.service';
import { IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { PlayerAvatarComponent } from '../../../../components/player-avatar/player-avatar.component';
import { InviteModalComponent } from '../invite-modal/invite-modal.component';
import { RoomPlayComponent } from '../play/room-play.component';
import { RefreshableContentComponent } from '../../../../components/refreshable-content/refreshable-content.component';
import { ChatComponent } from '../../../../components/chat/chat.component';

@Component({
	selector: 'gg-room-detail',
	host: { class: 'ion-page' },
	imports: [RouterLink, RoomPlayComponent, InviteModalComponent, PlayerAvatarComponent, ChatComponent, IonHeader, IonToolbar, IonButtons, IonTitle, IonButton, IonIcon, RefreshableContentComponent],
	templateUrl: './room-detail.component.html',
	styleUrl: './room-detail.component.scss',
})
export class RoomDetailComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly roomService = inject(RoomService);
	private readonly friendService = inject(FriendService);
	private readonly auth = inject(UserService);
	private readonly signalR = inject(SignalRService);
	private readonly toast = inject(ToastService);
	private readonly destroyRef = inject(DestroyRef);

	public readonly roomId = signal('');
	public readonly room = signal<RoomData | null>(null);
	public readonly loading = signal(false);
	public readonly copied = signal(false);

	public readonly myId = computed(() => this.auth.user()?.player.id ?? '');
	public readonly isHost = computed(() => this.room()?.hostId === this.myId());
	public readonly isInRoom = computed(() => this.room()?.players.some((p) => p.id === this.myId()) ?? false);

	public readonly canJoin = computed(() => {
		const r = this.room();
		if (!r || r.phase !== 'waiting' || this.isInRoom()) return false;
		if (r.kickedPlayers?.includes(this.myId())) return false;
		const maxPlayers = GAME_REGISTRY[r.game]?.maxPlayers ?? 0;
		return r.players.length < maxPlayers;
	});

	public readonly canStart = computed(() => {
		const r = this.room();
		if (!r || !this.isHost() || r.phase !== 'waiting') return false;
		const game = GAME_REGISTRY[r.game];
		if (!game) return false;
		return r.players.length >= game.minPlayers;
	});

	public readonly gameInfo = computed(() => {
		const g = this.room()?.game;
		return g ? GAME_REGISTRY[g] : undefined;
	});
	public readonly roomPlayerNames = computed(() => this.room()?.players.map(p => p.name) ?? []);
	public readonly memberIds = computed(() => this.room()?.players.map(p => p.id) ?? []);

	public readonly playerSlots = computed(() => {
		const r = this.room();
		if (!r) return [];
		const max = GAME_REGISTRY[r.game]?.maxPlayers ?? r.players.length;
		const slots: (typeof r.players[0] | null)[] = [...r.players];
		while (slots.length < max) slots.push(null);
		return slots;
	});

	public readonly refreshFn = computed(() =>
		this.room()?.phase !== 'playing'
			? async () => { await this.loadRoom(); }
			: undefined
	);

	/* @HostListener('window:beforeunload')
	public onBeforeUnload(): void {
		if (!this.hasLeft && this.isInRoom()) {
			this.roomService.leaveRoomBeacon(this.roomId());
		}
	} */

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

	public async join(): Promise<void> {
		try {
			this.loading.set(true);
			await this.roomService.joinRoom(this.roomId());
			await this.loadRoom();
		} finally {
			this.loading.set(false);
		}
	}

	public async start(): Promise<void> {
		try {
			this.loading.set(true);
			await this.roomService.startRoom(this.roomId());
			await this.loadRoom();
		} finally {
			this.loading.set(false);
		}
	}

	public async leave(): Promise<void> {
		const confirmed = await this.toast.yesNo('Are you sure you want to leave the room?');
		if (!confirmed) return;

		await this.roomService.leaveRoom(this.roomId());
		this.router.navigate(['/play']);
	}

	public async closeRoom(): Promise<void> {
		const confirmed = await this.toast.yesNo('Close the room for everyone?');
		if (!confirmed) return;

		await this.roomService.deleteRoom(this.roomId());
		void this.router.navigate(['/play']);
	}

	public async kick(player: GamePlayer): Promise<void> {
		const confirmed = await this.toast.yesNo(`Kick ${player.name} from the room?`);
		if (!confirmed) return;

		await this.roomService.kickPlayer(this.roomId(), player.id);
	}

	public async copyCode(): Promise<void> {
		await navigator.clipboard.writeText(window.location.href);
		this.copied.set(true);
		setTimeout(() => this.copied.set(false), 2000);
	}

	public readonly showInviteModal = signal(false);

	public invite(): void {
		if (this.isInRoom() && this.room()?.phase === 'waiting') this.showInviteModal.set(true);
	}

	/** Friend requests target registered players only, and never yourself or existing friends/requests. */
	public canAddFriend(slot: GamePlayer): boolean {
		if (this.auth.user()?.isGuest) return false;
		if (slot.id === this.myId() || slot.isGuest) return false;
		return this.friendService.relationship(slot.id) === 'none';
	}

	public readonly addingFriendId = signal<string | null>(null);

	public async addFriend(slot: GamePlayer): Promise<void> {
		if (this.addingFriendId()) return;
		this.addingFriendId.set(slot.id);
		try {
			await this.friendService.sendRequest(slot.id);
			this.toast.success(`Friend request sent to ${slot.name}`);
		} finally {
			this.addingFriendId.set(null);
		}
	}

}
