import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { NavbarComponent } from './components/navbar/navbar.component';
import { ToastComponent } from './components/toast/toast.component';
import { DeviceService } from '@gandogames/services/device.service';

@Component({
	selector: 'gg-app',
	host: { '[class.mobile]': 'device.isMobile()' },
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
	imports: [RouterOutlet, IonApp, IonRouterOutlet, NavbarComponent, ToastComponent],
})
export class App {
	protected readonly device = inject(DeviceService);
}
