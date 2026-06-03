import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { BaseRequest, Friend, FriendBaseRequest, FriendsListResponse } from '@gandogames/common/api';
import { UserService } from './user.service';
import { BackendService } from './backend.service';
import { SignalRService } from './signalr.service';
import { ToastService } from './toast.service';

export type FriendRelationship = 'none' | 'incoming' | 'outgoing' | 'accepted';

@Injectable({ providedIn: 'root' })
export class FriendService {
	private readonly backend = inject(BackendService);
	private readonly auth = inject(UserService);
	private readonly signalR = inject(SignalRService);
	private readonly toast = inject(ToastService);

	public readonly friends = signal<Friend[]>([]);
	public readonly incoming = signal<Friend[]>([]);
	public readonly outgoing = signal<Friend[]>([]);

	/** Count of pending incoming requests, surfaced as a menu badge. */
	public readonly pendingCount = computed(() => this.incoming().length);

	private get ticket(): string {
		return this.auth.user()!.sessionTicket;
	}

	/** Id we last loaded friends for, so profile tweaks (which replace the user object) don't re-fetch. */
	private loadedForUserId: string | null = null;

	constructor() {
		// Friends are a registered-user feature: load on login, clear on logout / for guests.
		effect(() => {
			const user = this.auth.user();
			const userId = user && !user.isGuest ? user.player.id : null;
			if (userId === this.loadedForUserId) return;
			this.loadedForUserId = userId;
			if (userId) void this.loadFriends();
			else this.clear();
		});

		this.signalR.events.friendRequest.subscribe(from => {
			this.toast.show(`${from.name} sent you a friend request`, 'info');
			void this.loadFriends();
		});
		this.signalR.events.friendsChanged.subscribe(() => void this.loadFriends());
	}

	private clear(): void {
		this.friends.set([]);
		this.incoming.set([]);
		this.outgoing.set([]);
	}

	/** The caller's relationship to the given player id, derived from the loaded buckets. */
	public relationship(playerId: string): FriendRelationship {
		if (this.friends().some(f => f.id === playerId)) return 'accepted';
		if (this.incoming().some(f => f.id === playerId)) return 'incoming';
		if (this.outgoing().some(f => f.id === playerId)) return 'outgoing';
		return 'none';
	}

	public async loadFriends(): Promise<void> {
		if (!this.auth.user()) return;
		const request: BaseRequest = { sessionTicket: this.ticket };
		const result = await this.backend.post<FriendsListResponse>('/friends/list', request);
		this.friends.set(result.friends);
		this.incoming.set(result.incoming);
		this.outgoing.set(result.outgoing);
	}

	public async sendRequest(friendId: string): Promise<void> {
		const request: FriendBaseRequest = { sessionTicket: this.ticket, friendId };
		// Reload even on failure: a non-atomic two-edge write may have partially committed.
		try {
			await this.backend.post<void>('/friends/request', request);
		} finally {
			await this.loadFriends();
		}
	}

	public async acceptRequest(friendId: string): Promise<void> {
		const request: FriendBaseRequest = { sessionTicket: this.ticket, friendId };
		try {
			await this.backend.post<void>('/friends/accept', request);
		} finally {
			await this.loadFriends();
		}
	}

	/** Decline an incoming request, cancel an outgoing one, or unfriend an accepted friend. */
	public async removeFriend(friendId: string): Promise<void> {
		const request: FriendBaseRequest = { sessionTicket: this.ticket, friendId };
		try {
			await this.backend.post<void>('/friends/remove', request);
		} finally {
			await this.loadFriends();
		}
	}
}
