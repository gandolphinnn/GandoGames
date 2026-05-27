import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { UserService } from '@gandogames/services/user.service';
import { RoomService } from '@gandogames/services/room.service';
import { GameType } from '@gandogames/common/api';

@Component({
	selector: 'gg-navbar',
	templateUrl: './navbar.component.html',
	styleUrl: './navbar.component.scss',
	standalone: true,
	imports: [RouterLink],
})
export class NavbarComponent {
	private readonly userService = inject(UserService);
	public readonly isLoggedIn = this.userService.isLoggedIn;

	private readonly roomService = inject(RoomService);
	private readonly router = inject(Router);
	public readonly myRooms = this.roomService.myRooms;

	public readonly menuOpen = signal(false);
	public readonly roomsDropdownOpen = signal(false);

	public toggleMenu(): void { this.menuOpen.update(v => !v); }
	public closeMenu(): void { this.menuOpen.set(false); }

	public toggleRoomsDropdown(): void { this.roomsDropdownOpen.update(v => !v); }
	public closeRoomsDropdown(): void { this.roomsDropdownOpen.set(false); }

	public goToRoom(roomId: string): void {
		void this.router.navigate(['/play', roomId]);
		this.roomsDropdownOpen.set(false);
	}

	public gameLabel(game: GameType): string {
		return GAME_REGISTRY.find(g => g.id === game)?.name ?? game;
	}

	public hasLiveRoom = computed(() => this.myRooms().some(r => r.phase === 'playing'));
}
