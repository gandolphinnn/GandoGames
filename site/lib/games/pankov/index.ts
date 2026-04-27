import { Routes } from '@angular/router';

import { PankovLobbyComponent } from './src/room/pankov-lobby.component';
import { PankovRoomGameComponent } from './src/room/pankov-room-game.component';

export const PANKOV_ROUTES: Routes = [
	{ path: '', component: PankovLobbyComponent },
	{ path: 'room/:roomId', component: PankovRoomGameComponent },
];
