import { bootstrapApplication } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import {
  add, alertCircle, arrowBack, arrowForward, chatbubbles, checkmark,
  checkmarkCircle, close, copy, dice, enter, fileTray, gameController,
  hardwareChip, heart, helpCircle, informationCircle, logOut, mail,
  moon, people, person, personAdd, ribbon, send, sunny, sync, trash, warning,
} from 'ionicons/icons';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';

addIcons({
  add, chatbubbles, checkmark, close, copy, dice, enter, heart,
  mail, moon, people, person, ribbon, send, sunny, sync, trash, warning,
  'alert-circle': alertCircle,
  'arrow-back': arrowBack,
  'arrow-forward': arrowForward,
  'checkmark-circle': checkmarkCircle,
  'file-tray': fileTray,
  'game-controller': gameController,
  'hardware-chip': hardwareChip,
  'help-circle': helpCircle,
  'information-circle': informationCircle,
  'log-out': logOut,
  'person-add': personAdd,
});

bootstrapApplication(App, appConfig)
	.catch((err) => console.error(err));
