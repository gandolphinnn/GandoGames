import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '@gandogames/services/auth.service';
import { ThemeService } from '@gandogames/services/theme.service';
import { RoomService } from '@gandogames/services/room.service';
import { SignalRService } from '@gandogames/services/signalr.service';

@Component({
	selector: 'gg-navbar',
	templateUrl: './navbar.component.html',
	styleUrl: './navbar.component.scss',
	standalone: true,
	imports: [RouterLink],
})
export class NavbarComponent {
	private readonly authService = inject(AuthService);
	public readonly isLoggedIn = this.authService.isLoggedIn;
	public readonly isAdmin = computed(() => this.authService.user()?.player.permissions?.includes('admin'));

	private readonly themeService = inject(ThemeService);
	public readonly isDark = this.themeService.isDark;
	public readonly themeLabel = computed(() => this.isDark() ? 'Switch to light mode' : 'Switch to dark mode');

	private readonly roomService = inject(RoomService);
	private readonly router = inject(Router);
	public readonly myRoom = this.roomService.myRoom;

	private readonly signalRService = inject(SignalRService);
	public readonly onlineCount = this.signalRService.onlineCount;
	public readonly onlineUsers = this.signalRService.onlineUsers;

	public readonly menuOpen = signal(false);
	public toggleMenu(): void { this.menuOpen.update(v => !v); }
	public closeMenu(): void { this.menuOpen.set(false); }

	public toggleTheme(): void { this.themeService.toggle(); }

	public goToMyRoom(): void {
		const room = this.myRoom();
		if (room) void this.router.navigate(['/play', room.id]);
	}
}
