import { Component, computed, HostListener, inject, input, output, signal } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Friend, GameType } from '@gandogames/shared/dto';
import { PlayerAvatarComponent } from '@gandogames/lib/common/player-avatar';
import { FriendService, RoomService, UserService, ToastService } from '@gandogames/services';

@Component({
	selector: 'gg-invite-modal',
	imports: [IonIcon, PlayerAvatarComponent, TranslatePipe, IonButton],
	templateUrl: './invite-modal.component.html',
	styleUrl: './invite-modal.component.scss',
})
export class InviteModalComponent {
	private readonly friendService = inject(FriendService);
	private readonly roomService = inject(RoomService);
	private readonly userService = inject(UserService);
	private readonly toast = inject(ToastService);
	private readonly translate = inject(TranslateService);
	
	public readonly roomId = input.required<string>();
	public readonly gameType = input.required<GameType>();
	public readonly isHost = input.required<boolean>();
	public readonly playerCount = input.required<number>();
	public readonly maxPlayers = input.required<number>();
	/** Ids of players already in the room, so they are marked as joined instead of invitable. */
	public readonly memberIds = input<string[]>([]);
	
	public readonly closed = output<void>();
	
	public readonly loading = signal(false);
	public readonly search = signal('');
	/** Friend currently being invited, to disable its button while the request is in flight. */
	public readonly busyId = signal<string | null>(null);
	/** Friends invited during this session, to show a confirmed state. */
	public readonly invited = signal<string[]>([]);

	public readonly isGuest = computed(() => this.userService.user()?.player.type === 'guest');
	public readonly isFull = computed(() => this.playerCount() >= this.maxPlayers());

	public readonly friends = this.friendService.friends;
	public readonly filteredFriends = computed(() => {
		const query = this.search().trim().toLowerCase();
		const friends = this.friends();
		if (!query) return friends;
		return friends.filter(f => f.name.toLowerCase().includes(query));
	});

	public isInRoom(id: string): boolean {
		return this.memberIds().includes(id);
	}

	public async invite(friend: Friend): Promise<void> {
		if (this.busyId() || this.isFull() || this.isInRoom(friend.id) || this.invited().includes(friend.id)) return;
		this.busyId.set(friend.id);
		try {
			await this.roomService.invitePlayer(this.roomId(), friend.id);
			this.invited.update(ids => [...ids, friend.id]);
			this.toast.success(this.translate.instant('INVITE_MODAL.INVITE_SENT', { name: friend.name }) as string);
		} finally {
			this.busyId.set(null);
		}
	}

	public async addBot(): Promise<void> {
		this.loading.set(true);
		await this.roomService.addBot(this.roomId());
		this.loading.set(false);
		this.closed.emit();
	}

	@HostListener('document:keydown.escape')
	public onEscape(): void {
		this.closed.emit();
	}

	public onBackdropClick(): void {
		this.closed.emit();
	}
}
