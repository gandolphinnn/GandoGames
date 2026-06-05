import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app.routes';
import { UserService } from './services/user.service';
import { RoomService } from './services/room.service';

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(routes),
		provideHttpClient(),
		provideIonicAngular(),
		provideAppInitializer(async () => {
			const user = inject(UserService);
			const rooms = inject(RoomService);
			await user.init();
			// Populate the "Active Rooms" menu app-wide at startup; don't block bootstrap on it.
			if (user.user()) void rooms.loadRooms();
		}),
	]
};
