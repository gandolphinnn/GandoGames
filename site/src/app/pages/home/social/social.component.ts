import { Component, computed, inject, signal } from '@angular/core';
import { IonButtons, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { RefreshableContentComponent } from '../../../components/refreshable-content/refreshable-content.component';
import { PlayerAvatarComponent } from '../../../components/player-avatar/player-avatar.component';
import { Friend } from '@gandogames/shared/api';
import { FriendService } from '@gandogames/services/friend.service';
import { UserService } from '@gandogames/services/user.service';
import { ToastService } from '@gandogames/services/toast.service';

@Component({
	selector: 'gg-social',
	host: { class: 'ion-page' },
	imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonIcon, RefreshableContentComponent, PlayerAvatarComponent],
	templateUrl: './social.component.html',
	styleUrl: './social.component.scss',
})
export class SocialComponent {
	private readonly friendService = inject(FriendService);
	private readonly auth = inject(UserService);
	private readonly toast = inject(ToastService);

	public readonly isGuest = computed(() => this.auth.user()?.isGuest ?? false);
	public readonly friends = this.friendService.friends;
	public readonly incoming = this.friendService.incoming;
	public readonly outgoing = this.friendService.outgoing;

	/** Id of the friend currently being acted on, to disable its buttons. */
	public readonly busyId = signal<string | null>(null);

	public readonly refreshFn = async (): Promise<void> => {
		if (!this.isGuest()) await this.friendService.loadFriends();
	};

	public async accept(id: string): Promise<void> {
		this.busyId.set(id);
		try {
			await this.friendService.acceptRequest(id);
		} finally {
			this.busyId.set(null);
		}
	}

	public async remove(friend: Friend, kind: 'decline' | 'cancel' | 'unfriend'): Promise<void> {
		if (kind === 'unfriend' && !(await this.toast.yesNo(`Remove ${friend.name} from your friends?`))) return;
		this.busyId.set(friend.id);
		try {
			await this.friendService.removeFriend(friend.id);
			const message = kind === 'unfriend'
				? `Removed ${friend.name} from your friends`
				: kind === 'decline'
					? `Declined ${friend.name}'s friend request`
					: `Cancelled friend request to ${friend.name}`;
			this.toast.show(message, 'success');
		} finally {
			this.busyId.set(null);
		}
	}
}
