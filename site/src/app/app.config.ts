import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { routes } from './app.routes';
import { StaticTranslateLoader } from '../i18n/translate-loader';
import { UserService } from './services/user.service';
import { RoomService } from './services/room.service';
import { registerLocaleData } from '@angular/common';

import localeIt from '@angular/common/locales/it';
import localeEn from '@angular/common/locales/en';

registerLocaleData(localeIt, 'it-IT');
registerLocaleData(localeEn, 'en-US');

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(routes),
		provideHttpClient(withXhr()),
		provideIonicAngular(),
		provideTranslateService({
			lang: 'en',
			fallbackLang: 'en',
			loader: StaticTranslateLoader,
		}),
		provideAppInitializer(async () => {
			const user = inject(UserService);
			const rooms = inject(RoomService);
			await user.init();
			// Populate the "Active Rooms" menu app-wide at startup; don't block bootstrap on it.
			if (user.user()) void rooms.loadRooms();
		}),
	]
};
