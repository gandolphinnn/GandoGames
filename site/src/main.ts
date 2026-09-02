import { bootstrapApplication } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import {
	add, alertCircle, arrowBack, arrowForward,
	chatbubbles, checkmark, checkmarkCircle, chevronForward, close, contrastOutline, copy,
	fileTray, flash, gameController, globe, helpCircle, informationCircle,
	languageOutline, link, lockClosed, logOutOutline,
	moon, moonOutline, people, personAdd, personCircle, personRemove, ribbon,
	send, settingsOutline, sunny, sunnyOutline,
	trash, trashOutline, warning,
} from 'ionicons/icons';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';

addIcons({
	add, alertCircle, arrowBack, arrowForward,
	chatbubbles, checkmark, checkmarkCircle, chevronForward, close, contrastOutline, copy,
	fileTray, flash, gameController, globe, helpCircle, informationCircle,
	languageOutline, link, lockClosed, logOutOutline,
	moon, moonOutline, people, personAdd, personCircle, personRemove, ribbon,
	send, settingsOutline, sunny, sunnyOutline,
	trash, trashOutline, warning,
});


bootstrapApplication(App, appConfig)
	.catch((err) => console.error(err));
