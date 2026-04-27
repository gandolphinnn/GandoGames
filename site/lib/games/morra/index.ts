import { Routes } from '@angular/router';

import { MorraLobbyComponent } from './src/room/morra-lobby.component';
import { MorraRoomGameComponent } from './src/room/morra-room-game.component';

export const MORRA_ROUTES: Routes = [
	{ path: '', component: MorraLobbyComponent },
	{ path: 'room/:roomId', component: MorraRoomGameComponent },
];
