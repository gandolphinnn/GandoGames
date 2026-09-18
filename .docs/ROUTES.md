# Routes

Defined in `site/src/app/app.routes.ts`, with the authenticated area lazy-loaded from `pages/home/home.routes.ts` and the room area from `pages/home/room/room.routes.ts`. All components are standalone and lazy-loaded.

### Public
- `/about` — project info
- `/games` — list of all the games availables

### Auth — `noAuthGuard` (redirects to `/` if already logged in)
- `/login`
- `/signup`

### Authenticated — `authGuard` (redirects to `/login?returnUrl=…` if not logged in)
`HomeComponent` is the shell (renders an `ion-router-outlet`); the rest are its children:
- `/` → redirects to `/games`
- `/admin/rooms` — admin panel with a list of all the rooms
- `/admin/playground` — admin panel with the old test/palette page
- `/profile` — profile & preferences (icon, theme, language), logout, delete account
- `/social` — friends list and requests
- `/rooms` — room list (the caller's active rooms + browsable rooms, with a per-game filter)
- `/play/local/:gameId` — play games that supports local
- `/play/global/:gameId` — play in a single player game with global leaderboard
- `/play/room/:roomId` — room detail: lobby while `waiting`, hosts the game while `playing`

### Fallback
- `**` → redirects to `/games`
