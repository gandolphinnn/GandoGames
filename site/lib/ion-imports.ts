import {
	IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';

/**
 * The Ionic building blocks every routed page shares: the header/toolbar
 * cluster (with the hamburger menu button) plus the page content host and
 * buttons. Spread into a component's `imports` array to avoid repeating the
 * cluster everywhere, then add only the page-specific extras:
 *
 * ```ts
 * imports: [...ION_IMPORTS, IonCard, IonSegment],
 * ```
 */
export const ION_IMPORTS = [
	IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonIcon, IonButton, IonContent,
] as const;
