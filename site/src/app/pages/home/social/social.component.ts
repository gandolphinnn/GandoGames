import { Component } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
	selector: 'gg-social',
	host: { class: 'ion-page' },
	imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonIcon],
	templateUrl: './social.component.html',
	styleUrl: './social.component.scss',
})
export class SocialComponent {}
