import { Component, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Friend } from '@gandogames/shared/dto';
import { ION_IMPORTS } from '@gandogames/lib/ion-imports';
import { FriendService, UserService, ToastService } from '@gandogames/services';
import { RefreshableContentComponent, PlayerAvatarComponent } from '@gandogames/components';

@Component({
	selector: 'gg-social',
	host: { class: 'ion-page' },
	imports: [...ION_IMPORTS, PlayerAvatarComponent, RefreshableContentComponent],
	templateUrl: './social.component.html',
	styleUrl: './social.component.scss',
})
export class SocialComponent {
	private readonly friendService = inject(FriendService);
	private readonly auth = inject(UserService);
	private readonly toast = inject(ToastService);
	private readonly translate = inject(TranslateService);

	public readonly isGuest = computed(() => this.auth.user()?.player.type === 'guest');
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
		const params = { name: friend.name };
		if (kind === 'unfriend' && !(await this.toast.yesNo(this.translate.instant('SOCIAL.REMOVE_CONFIRM', params) as string))) return;
		this.busyId.set(friend.id);
		try {
			await this.friendService.removeFriend(friend.id);
			const messageKey = kind === 'unfriend'
				? 'SOCIAL.REMOVED'
				: kind === 'decline'
					? 'SOCIAL.DECLINED'
					: 'SOCIAL.CANCELLED';
			this.toast.show(this.translate.instant(messageKey, params) as string, 'success');
		} finally {
			this.busyId.set(null);
		}
	}
}
