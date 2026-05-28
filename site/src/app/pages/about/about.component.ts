import { Component } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
	selector: 'gg-about',
	host: { class: 'ion-page' },
	imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonIcon],
	templateUrl: './about.component.html',
	styleUrl: './about.component.scss',
})
export class AboutComponent {}
