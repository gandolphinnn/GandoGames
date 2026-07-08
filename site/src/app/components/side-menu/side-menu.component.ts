import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
	IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonImg,
	IonItem, IonLabel, IonList, IonMenuToggle, IonTitle, IonToolbar,
	MenuController,
} from '@ionic/angular/standalone';
import { GameType } from '@gandogames/shared/dto';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { PlayerAvatarComponent } from '@gandogames/lib/common/player-avatar';
import { UserService, RoomService, FriendService, UrlService } from '@gandogames/services';

/**
 * The app's side-menu content: brand header, profile shortcut, navigation and the caller's
 * active rooms. Rendered inside the shell's `ion-menu` (App owns the menu/split-pane chrome),
 * so it looks identical whether the menu is an overlay drawer or pinned on desktop.
 */
@Component({
	selector: 'gg-side-menu',
	host: { style: 'display: contents' },
	imports: [
		IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonImg,
		IonItem, IonLabel, IonList, IonMenuToggle, IonTitle, IonToolbar,
		PlayerAvatarComponent, RouterLink, RouterLinkActive,
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
	public readonly myRooms = this.roomService.myRooms;
	public readonly pendingFriendRequests = this.friendService.pendingCount;

	public gameLabel(game: GameType): string {
		return GAME_REGISTRY[game]?.name ?? game;
	}

	public async goToRoom(roomId: string): Promise<void> {
		await this.menuCtrl.close('main-menu');
		void this.urlService.get('play').navigate({ roomId });
	}
}
