import { Component } from '@angular/core';
import {
	IonHeader, IonToolbar, IonTitle, IonContent,
	IonList, IonItem, IonLabel, IonIcon, IonListHeader,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAddOutline, mailOutline, peopleOutline } from 'ionicons/icons';

@Component({
	selector: 'gg-social',
	host: { class: 'ion-page' },
	imports: [
		IonHeader, IonToolbar, IonTitle, IonContent,
		IonList, IonItem, IonLabel, IonIcon, IonListHeader,
	],
	templateUrl: './social.component.html',
	styleUrl: './social.component.scss',
})
export class SocialComponent {
	constructor() {
		addIcons({ personAddOutline, mailOutline, peopleOutline });
	}
}
