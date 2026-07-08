import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GamePlayer, RoomData } from '@gandogames/shared/dto';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { ION_IMPORTS } from '@gandogames/lib/ion-imports';
import { roomAccessOption } from '@gandogames/lib/room-access';
import { buildTableSeats, GameTableComponent, GameTableSeatDef, TablePreset, TableSeat } from '@gandogames/lib/common/game-table';
import { FriendService, RoomService, ToastService, UserService } from '@gandogames/services';
import { GameSettingsModalComponent, InviteModalComponent, PlayerAvatarComponent } from '@gandogames/components';

/** Lobby body for a waiting/ended room. Header, chat and layout are owned by RoomComponent. */
@Component({
	selector: 'gg-room-lobby',
	imports: [...ION_IMPORTS, GameTableComponent, GameTableSeatDef, GameSettingsModalComponent, InviteModalComponent, PlayerAvatarComponent, RouterLink],
	templateUrl: './room-lobby.component.html',
	styleUrl: './room-lobby.component.scss',
})
export class RoomLobbyComponent {
	private readonly roomService = inject(RoomService);
	private readonly friendService = inject(FriendService);
	private readonly auth = inject(UserService);
	private readonly toast = inject(ToastService);

	public readonly room = input.required<RoomData | null>();
	public readonly roomAccessClass = computed(() => {
		const roomAccess = this.room();
		return roomAccess ? roomAccessOption(roomAccess.access ?? 'public') : '';
	});
	public readonly roomId = input<string>('');
	public readonly isHost = input<boolean>(false);
	public readonly isInRoom = input<boolean>(false);
	public readonly myId = input<string>('');

	public readonly loading = signal(false);
	public readonly showInviteModal = signal(false);
	public readonly showSettingsModal = signal(false);
	public readonly addingFriendId = signal<string | null>(null);

	/** Whether the room's host is an accepted friend of the viewer — gates friends-only joins. */
	public readonly isHostFriend = computed(() => {
		const hostId = this.room()?.hostId;
		return hostId ? this.friendService.relationship(hostId) === 'accepted' : false;
	});

	/** Icon + label describing the room's access policy, for the lobby badge. */
	public readonly accessBadge = computed(() => roomAccessOption(this.room()?.access ?? 'public'));

	public readonly canJoin = computed(() => {
		const r = this.room();
		if (!r || r.phase !== 'waiting' || this.isInRoom()) return false;
		if (r.kickedPlayers?.includes(this.myId())) return false;
		if ((r.access ?? 'public') === 'closed') return false;
		if ((r.access ?? 'public') === 'friends' && r.hostId !== this.myId() && !this.isHostFriend()) return false;
		const maxPlayers = GAME_REGISTRY[r.game]?.maxPlayers ?? 0;
		return r.players.length < maxPlayers;
	});

	/** Why a non-member can't join right now (empty when they can, or are already in). */
	public readonly joinBlockedReason = computed(() => {
		const r = this.room();
		if (!r || r.phase !== 'waiting' || this.isInRoom() || this.canJoin()) return '';
		if (r.kickedPlayers?.includes(this.myId())) return 'You have been kicked from this room.';
		if ((r.access ?? 'public') === 'closed') return 'This room is closed.';
		if ((r.access ?? 'public') === 'friends' && !this.isHostFriend()) return "Only the host's friends can join this room.";
		return 'This room is full.';
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

	/** Whether this game exposes any configurable settings — hides the settings button when it doesn't. */
	public readonly hasSettings = computed(() => (this.gameInfo()?.settingsSchema.length ?? 0) > 0);

	public readonly memberIds = computed(() => this.room()?.players.map(p => p.id) ?? []);

	/** The game's table look (felt/neutral + label), shared with the in-game view. */
	public readonly preset = computed<TablePreset>(() => {
		const g = this.room()?.game;
		return g ? GAME_REGISTRY[g].table : { variant: 'neutral' };
	});

	/**
	 * Seat ring: players in playing order, viewer rotated to bottom-centre. Members waiting in a
	 * non-full room get a single extra open seat (the invite affordance); everyone else sees just the
	 * seated players — non-members join via the footer button rather than an empty "sit" seat.
	 */
	public readonly seats = computed<TableSeat[]>(() => {
		const r = this.room();
		if (!r) return [];
		const max = GAME_REGISTRY[r.game]?.maxPlayers ?? r.players.length;
		const canInvite = this.isInRoom() && r.phase === 'waiting' && r.players.length < max;
		const ringSize = canInvite ? r.players.length + 1 : r.players.length;
		return buildTableSeats(r.players, this.myId(), ringSize);
	});

	/** The lone open seat is an invite affordance for members while waiting. */
	public onSeatClick(seat: TableSeat): void {
		if (seat.player) return;
		if (this.isInRoom() && this.room()?.phase === 'waiting') this.invite();
	}

	public async join(): Promise<void> {
		try {
			this.loading.set(true);
			await this.roomService.joinRoom(this.roomId());
		} finally {
			this.loading.set(false);
		}
	}

	public async start(): Promise<void> {
		try {
			this.loading.set(true);
			await this.roomService.startRoom(this.roomId());
		} finally {
			this.loading.set(false);
		}
	}

	public async kick(player: GamePlayer): Promise<void> {
		const confirmed = await this.toast.yesNo(`Kick ${player.name} from the room?`);
		if (!confirmed) return;

		await this.roomService.kickPlayer(this.roomId(), player.id);
	}

	public invite(): void {
		if (this.isInRoom() && this.room()?.phase === 'waiting') this.showInviteModal.set(true);
	}

	public openSettings(): void {
		this.showSettingsModal.set(true);
	}

	/** Friend requests target registered players only, and never yourself or existing friends/requests. */
	public canAddFriend(slot: GamePlayer): boolean {
		if (this.auth.user()?.isGuest) return false;
		if (slot.id === this.myId() || slot.isGuest) return false;
		return this.friendService.relationship(slot.id) === 'none';
	}

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
