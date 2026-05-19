import { Component } from '@angular/core';
import {
	IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, logoGithub } from 'ionicons/icons';

@Component({
	selector: 'gg-about',
	host: { class: 'ion-page' },
	imports: [
		IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonIcon,
	],
	templateUrl: './about.component.html',
	styleUrl: './about.component.scss',
})
export class AboutComponent {
	constructor() {
		addIcons({ arrowForwardOutline, logoGithub });
	}
}
