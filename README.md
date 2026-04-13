# GandoGames

Hobby multiplayer web app for playing games with friends.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20 (standalone components, SASS) |
| API | Azure Functions v4 (TypeScript) |
| Game services | Azure PlayFab (auth, rooms, statistics, game history) |
| Hosting | Azure Static Web Apps |

## Architecture

### Project layout

```
gandogames/
├── src/                      # Angular application
│   └── app/
│       ├── core/             # Guards, interceptors, services
│       ├── features/         # Auth, lobby, game-host pages
│       └── shell/            # Layout component
├── games/                    # Self-contained game packages
│   ├── pankov/               # Pankov game
│   └── trio/                 # Trio game
└── api/                      # Azure Functions API (to be added)
```

### How games work

Each game lives in `games/<name>/` as a self-contained package.
It exports an Angular `Routes` array and is lazy-loaded into the main app via a central `GAME_REGISTRY`.
Adding a new game requires no changes to the core app logic.

TypeScript path aliases make imports clean:

```typescript
import { PANKOV_ROUTES } from '@gandogames/pankov';
import { TRIO_ROUTES } from '@gandogames/trio';
```

### Data storage

No external database. Azure PlayFab covers all needs at this scale:

| Need | PlayFab API |
|---|---|
| Auth | Login / Register with email |
| Rooms | Lobbies API |
| Game history | Custom Events (PlayStream) |
| Player stats | Statistics API (built-in leaderboards) |
| Player data | Entity Objects (JSON blobs) |

### API responsibilities

The Azure Functions API is a secure proxy to PlayFab.
It keeps `PLAYFAB_SECRET_KEY` server-side and handles:
auth, room CRUD, saving game results, and reading stats.
Game logic itself runs in the Angular app.

### Auth flow

1. User submits login/register form → `POST /api/auth/login` or `/api/auth/register`
2. Azure Function calls PlayFab with the secret key, returns session ticket + player profile
3. Angular stores the session ticket and uses it for subsequent calls

## Games

| ID | Name | Path alias | Status |
|---|---|---|---|
| `pankov` | Pankov | `@gandogames/pankov` | In development |
| `trio` | Trio | `@gandogames/trio` | In development |

## Local development

```bash
# Install dependencies
npm install

# Angular dev server (port 4200)
ng serve

# Azure Functions dev server (port 7071) — once api/ is set up
cd api && func start

# Run both via Azure SWA CLI (port 4280)
swa start http://localhost:4200 --api-location api
```

## Environment setup

### Angular (`src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  playfabTitleId: 'YOUR_TITLE_ID',
  apiBaseUrl: 'http://localhost:7071/api'
};
```

### Azure Functions (`api/local.settings.json`) — never commit this file

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "PLAYFAB_TITLE_ID": "YOUR_TITLE_ID",
    "PLAYFAB_SECRET_KEY": "YOUR_SECRET_KEY"
  }
}
```

## Adding a new game

1. Create `games/<name>/index.ts` and implement routes + components inside `games/<name>/`
2. Add path alias to `tsconfig.json`:
   ```json
   "@gandogames/<name>": ["games/<name>/index.ts"]
   ```
3. Add one entry to `src/app/game-registry.ts`

## Deployment

Deployed via Azure Static Web Apps.
Push to `main` triggers the GitHub Actions workflow which builds the Angular app and deploys static files + Azure Functions.

## Future work

- Push notifications: room invites via Web Push API + Angular Service Worker
