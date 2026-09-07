import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
	IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonImg,
	IonItem, IonLabel, IonList, IonMenuToggle, IonTitle, IonToolbar,
	MenuController,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { GameType } from '@gandogames/shared/dto';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { PlayerAvatarComponent } from '@gandogames/lib/common/player-avatar';
import { UserService, RoomService, FriendService, UrlService } from '@gandogames/services';

/**
 * The app's side-menu content: brand header, profile shortcut, navigation and the caller's
 * active rooms. Rendered inside the shell's overlay `ion-menu` (App owns the menu chrome).
 * The item matching the current page — including the active room — is highlighted.
 */
@Component({
	selector: 'gg-side-menu',
	host: { style: 'display: contents' },
	imports: [
		IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonImg,
		IonItem, IonLabel, IonList, IonMenuToggle, IonTitle, IonToolbar,
		PlayerAvatarComponent, RouterLink, RouterLinkActive, TranslatePipe,
	],
	templateUrl: './side-menu.component.html',
	styleUrl: './side-menu.component.scss',
})
export class SideMenuComponent {
	private readonly userService = inject(UserService);
	private readonly roomService = inject(RoomService);
	private readonly friendService = inject(FriendService);
	private readonly urlService = inject(UrlService);
	private readonly menuCtrl = inject(MenuController);

	public readonly user = this.userService.user;
	public readonly isAdmin = this.userService.isAdmin;
	public readonly myRooms = this.roomService.myRooms;
	public readonly pendingFriendRequests = this.friendService.pendingCount;

	/** Room id in the current URL, to highlight the matching entry in the active-rooms list. */
	public readonly activeRoomId = computed(() => this.urlService.current().segments['roomId'] ?? '');

	public gameLabel(game: GameType): string {
		return GAME_REGISTRY[game]?.name ?? game;
	}

	public gameIcon(game: GameType): string {
		return GAME_REGISTRY[game]?.icon ?? '';
	}

	public async goToRoom(roomId: string): Promise<void> {
		await this.menuCtrl.close('main-menu');
		void this.urlService.buildState('play_room', { roomId: roomId }).navigate();
	}
}
