import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
	selector: 'gg-app',
	imports: [IonApp, IonRouterOutlet],
	template: `<ion-app><ion-router-outlet /></ion-app>`,
	styles: [`ion-app { background: var(--bg); }`],
})
export class App {}
