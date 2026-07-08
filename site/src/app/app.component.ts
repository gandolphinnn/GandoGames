import { Component, inject } from '@angular/core';
import { IonApp, IonMenu, IonRouterOutlet } from '@ionic/angular/standalone';

import { UserService } from '@gandogames/services';
import { SideMenuComponent, ToastComponent } from '@gandogames/components';

/** Root shell: overlay side menu + router outlet. The menu content lives in `gg-side-menu`. */
@Component({
	selector: 'gg-app',
	imports: [IonApp, IonMenu, IonRouterOutlet, SideMenuComponent, ToastComponent],
	templateUrl: './app.component.html',
})
export class App {
	private readonly userService = inject(UserService);

	public readonly isLoggedIn = this.userService.isLoggedIn;
}
