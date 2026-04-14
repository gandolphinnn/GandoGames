# GandoGames

Hobby multiplayer web app for playing games with friends.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20 (standalone components, SCSS) |
| API | Azure Functions v4 (TypeScript) |
| Game services | Azure PlayFab (auth, rooms, statistics) |
| Hosting | Azure Static Web Apps |

## Project layout

```
GandoGames/
├── common/
│   └── api.ts              # Shared HTTP contract types (site + api)
├── api/                    # Azure Functions v4 — secure PlayFab proxy
│   └── src/
│       ├── index.ts        # Barrel: registerAzureHttpFunction, pfPromise, PlayFab SDK
│       └── functions/      # auth · rooms · game · stats · health
└── site/                   # Angular SPA
    ├── src/app/            # Core app, services, pages
    ├── lib/games/          # Self-contained game packages
    │   ├── pankov/
    │   └── trio/
    └── public/             # Static assets
```

## How games work

Each game lives in `site/lib/games/<name>/` as a self-contained package.
It exports an Angular `Routes` array and is lazy-loaded into the main app via a central `GAME_REGISTRY`.
Adding a new game requires no changes to the core app logic.

TypeScript path aliases make imports clean:

```typescript
import { PANKOV_ROUTES } from '@gandogames/pankov';
import { TRIO_ROUTES } from '@gandogames/trio';
```

## Data storage

No external database. Azure PlayFab covers all needs at this scale:

| Need | PlayFab API |
|---|---|
| Auth | Login / Register with email or custom ID |
| Rooms | SharedGroups (room state as JSON) |
| Player stats | Statistics API (built-in leaderboards) |

## API

The Azure Functions API is a secure proxy to PlayFab — `PLAYFAB_SECRET_KEY` never leaves the server.
Every endpoint is registered with `registerAzureHttpFunction` from `api/src/index.ts`.
The `InnerFunction<TReq, TRes>` type defines handlers: return the response body directly, throw to produce an error, and set `options.errorCode` before throwing to control the status code.

## Auth flow

1. User submits login/register form → `POST /api/auth/login` or `/api/auth/register`
2. Azure Function calls PlayFab Client API, returns `{ SessionTicket, PlayFabId }`
3. Angular stores the session ticket and passes it in subsequent requests for identity verification

## Games

| ID | Name | Path alias | Status |
|---|---|---|---|
| `pankov` | Pankov | `@gandogames/pankov` | In development |
| `trio` | Trio | `@gandogames/trio` | In development |

## Local development

```bash
# Angular dev server (from site/)
cd site && npm install && ng serve        # → http://localhost:1212

# Azure Functions dev server (from api/)
cd api && npm install && func start       # → http://localhost:7071

# Run both behind Azure SWA CLI (from repo root)
swa start http://localhost:1212 --api-location api
```

## Environment setup

### Angular (`site/src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
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

1. Create `site/lib/games/<name>/index.ts` with routes + components
2. Add path alias to `site/tsconfig.json`:
   ```json
   "@gandogames/<name>": ["./lib/games/<name>/index.ts"]
   ```
3. Add one entry to `site/src/app/game-registry.ts`

## Deployment

Deployed via Azure Static Web Apps.
Push to `master` triggers the GitHub Actions workflow which builds the Angular app and deploys static files + Azure Functions.
