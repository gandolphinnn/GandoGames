import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { RoomService } from './services/room.service';
import { ToastService } from './services/toast.service';
import { SignalRService } from './services/signalr.service';

@Component({
	selector: 'gg-app',
	imports: [RouterLink, RouterOutlet],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class App {
	private readonly authService = inject(AuthService);
	public readonly isLoggedIn = this.authService.isLoggedIn;
	public readonly isAdmin = computed(() => this.authService.user()?.player.permissions?.includes('admin'));

	private readonly themeService = inject(ThemeService);
	public readonly isDark = this.themeService.isDark;
	public readonly themeLabel = computed(() => this.isDark() ? 'Switch to light mode' : 'Switch to dark mode');

	private readonly roomService = inject(RoomService);
	public readonly toastService = inject(ToastService);
	private readonly router = inject(Router);
	public readonly myRoom = this.roomService.myRoom;

	private readonly signalRService = inject(SignalRService);
	public readonly onlineCount = this.signalRService.onlineCount;
	public readonly onlineUsers = this.signalRService.onlineUsers;

	public readonly menuOpen = signal(false);
	public toggleMenu(): void { this.menuOpen.update(v => !v); }
	public closeMenu(): void { this.menuOpen.set(false); }

	public toggleTheme(): void {
		this.themeService.toggle();
	}

	public goToMyRoom(): void {
		const room = this.myRoom();
		if (room) void this.router.navigate(['/play', room.id]);
	}
}
