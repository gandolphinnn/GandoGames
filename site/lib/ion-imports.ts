import {
	IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
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
	IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonIcon, IonButton, IonContent, TranslatePipe,
] as const;
