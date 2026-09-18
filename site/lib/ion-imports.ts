import { RouterLink, RouterLinkActive } from '@angular/router';
import {
	IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonLabel, IonMenuButton, IonRouterOutlet, IonTitle, IonToolbar,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * The building blocks every routed page shares: the Ionic header/toolbar
 * cluster (with the hamburger menu button), the page content host, buttons
 * and the `translate` pipe. Spread into a component's `imports` array to
 * avoid repeating the cluster everywhere, then add only the page-specific
 * extras:
 *
 * ```ts
 * imports: [...ION_IMPORTS, IonCard, IonSegment],
 * ```
 */
export const BASE_IMPORTS = [
	IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonLabel, IonMenuButton, IonTitle, IonToolbar,
	TranslatePipe,
] as const;

export const ROUTING_IMPORTS = [
	RouterLink, RouterLinkActive,
	IonRouterOutlet, 
] as const;