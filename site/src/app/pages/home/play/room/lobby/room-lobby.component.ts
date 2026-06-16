import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GamePlayer, RoomData } from '@gandogames/shared/api';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { ION_IMPORTS } from '@gandogames/lib/ion-imports';
import { FriendService } from '@gandogames/services/friend.service';
import { RoomService } from '@gandogames/services/room.service';
import { ToastService } from '@gandogames/services/toast.service';
import { UserService } from '@gandogames/services/user.service';
import { InviteModalComponent, PlayerAvatarComponent } from '@gandogames/components';

/** Lobby body for a waiting/ended room. Header, chat and layout are owned by RoomComponent. */
@Component({
	selector: 'gg-room-lobby',
	imports: [...ION_IMPORTS, InviteModalComponent, PlayerAvatarComponent, RouterLink],
	templateUrl: './room-lobby.component.html',
	styleUrl: './room-lobby.component.scss',
})
export class RoomLobbyComponent {
	private readonly roomService = inject(RoomService);
	private readonly friendService = inject(FriendService);
	private readonly auth = inject(UserService);
	private readonly toast = inject(ToastService);

	public readonly room = input<RoomData | null>(null);
	public readonly roomId = input<string>('');
	public readonly isHost = input<boolean>(false);
	public readonly isInRoom = input<boolean>(false);
	public readonly myId = input<string>('');

	public readonly loading = signal(false);
	public readonly showInviteModal = signal(false);
	public readonly addingFriendId = signal<string | null>(null);

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

	public readonly memberIds = computed(() => this.room()?.players.map(p => p.id) ?? []);

	public readonly playerSlots = computed(() => {
		const r = this.room();
		if (!r) return [];
		const max = GAME_REGISTRY[r.game]?.maxPlayers ?? r.players.length;
		const slots: (typeof r.players[0] | null)[] = [...r.players];
		while (slots.length < max) slots.push(null);
		return slots;
	});

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
