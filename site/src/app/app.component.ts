import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
	selector: 'gg-app',
	imports: [RouterLink, RouterOutlet],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class App {
	public readonly isLoggedIn = inject(AuthService).isLoggedIn;

	private readonly themeService = inject(ThemeService);
	public readonly isDark = this.themeService.isDark;
	public readonly themeLabel = computed(() => this.isDark() ? 'Switch to light mode' : 'Switch to dark mode');

	public toggleTheme(): void {
		this.themeService.toggle();
	}
}
