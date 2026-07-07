import { bootstrapApplication } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import {
  add, alertCircle, arrowBack, arrowForward, chatbubbles, checkmark,
  checkmarkCircle, chevronForward, close, contrastOutline, copy,
  fileTray, gameController, globe, helpCircle,
  informationCircle, languageOutline, link, lockClosed, logOutOutline,
  moon, people, personAdd, personCircle, personRemove, ribbon, send, settingsOutline, sunny,
  trash, trashOutline, warning,
} from 'ionicons/icons';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';

addIcons({
  add, alertCircle, arrowBack, arrowForward, chatbubbles, checkmark,
  checkmarkCircle, chevronForward, close, contrastOutline, copy,
  fileTray, gameController, globe, helpCircle,
  informationCircle, languageOutline, link, lockClosed, logOutOutline,
  moon, people, personAdd, personCircle, personRemove, ribbon, send, settingsOutline, sunny,
  trash, trashOutline, warning,
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
