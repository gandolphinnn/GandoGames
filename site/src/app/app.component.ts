import { Component, computed, inject } from '@angular/core';
import { IonApp, IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/angular/standalone';

import { UrlService, UserService } from '@gandogames/services';
import { SideMenuComponent, ToastComponent } from '@gandogames/components';

/** Root shell: split-pane + side menu + router outlet. The menu content lives in `gg-side-menu`. */
@Component({
	selector: 'gg-app',
	imports: [IonApp, IonMenu, IonRouterOutlet, IonSplitPane, SideMenuComponent, ToastComponent],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class App {
	private readonly userService = inject(UserService);
	private readonly urlService = inject(UrlService);

	public readonly isLoggedIn = this.userService.isLoggedIn;

	/**
	 * Pin the menu beside the content (split-pane) on desktop, but only on the room list —
	 * everywhere else (in a room, profile, …) it stays an overlay so the page keeps full width.
	 */
	public readonly menuWhen = computed(() =>
		this.urlService.isActive('play') ? '(min-width: 992px)' : false
	);
}
