import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
	IonApp, IonButton, IonButtons, IonContent, IonHeader,
	IonIcon, IonImg, IonItem, IonLabel, IonList, IonMenu,
	IonMenuToggle, IonRouterOutlet, IonTitle, IonToolbar,
	MenuController,
} from '@ionic/angular/standalone';

import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { GameType } from '@gandogames/common/api';
import { UserService } from '@gandogames/services/user.service';
import { RoomService } from '@gandogames/services/room.service';
import { FriendService } from '@gandogames/services/friend.service';
import { ToastComponent } from './components/toast/toast.component';
import { PlayerAvatarComponent } from './components/player-avatar/player-avatar.component';

const ION_COMPONENTS = [
	IonApp, IonButton, IonButtons, IonContent, IonHeader,
	IonIcon, IonImg, IonItem, IonLabel, IonList, IonMenu,
	IonMenuToggle, IonRouterOutlet, IonTitle, IonToolbar,
];

@Component({
	selector: 'gg-app',
	imports: [
		RouterLink, RouterLinkActive, ...ION_COMPONENTS,
		ToastComponent, PlayerAvatarComponent,
	],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class App {
	private readonly userService = inject(UserService);
	private readonly roomService = inject(RoomService);
	private readonly friendService = inject(FriendService);
	private readonly router = inject(Router);
	private readonly menuCtrl = inject(MenuController);

	public readonly user = this.userService.user;
	public readonly isLoggedIn = this.userService.isLoggedIn;
	public readonly myRooms = this.roomService.myRooms;
	public readonly pendingFriendRequests = this.friendService.pendingCount;
	public readonly hasLiveRoom = computed(() => this.myRooms().some(r => r.phase === 'playing'));

	public gameLabel(game: GameType): string {
		return GAME_REGISTRY.find(g => g.id === game)?.name ?? game;
	}

	public async closeMenu(): Promise<void> {
		await this.menuCtrl.close('main-menu');
	}

	public async goToRoom(roomId: string): Promise<void> {
		await this.menuCtrl.close('main-menu');
		void this.router.navigate(['/play', roomId]);
	}
}
