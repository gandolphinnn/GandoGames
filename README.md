# GandoGames

Hobby multiplayer web app for playing games with friends.
Try playing at this [url](https://www.gandogames.org/).

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20 (standalone components) + Ionic, SCSS |
| API | Azure Functions v4 (TypeScript) |
| Auth & data | Azure PlayFab (auth + room/game state in SharedGroups) |
| Real-time | Azure SignalR Service (serverless) |
| Hosting | Azure Static Web Apps |

## Project layout

```
GandoGames/
├── shared/                 # Shared HTTP-contract types (site + api)
│   ├── index.ts            # Re-exports shared/dto/*
│   └── dto/                # auth · room · game · signalr · friends · player-icons
├── api/                    # Azure Functions v4 — secure PlayFab proxy
│   └── src/
│       ├── index.ts        # Barrel: register wrappers, pfPromise, PlayFab clients, SignalR bindings
│       ├── functions/      # http/ (auth · rooms · game · chat · profile · friends · signalr · alive) + cron/
│       ├── db/             # PlayfabCtx (SharedGroups) + mockPlayFab (in-memory)
│       └── games/          # Server-side game logic (pankov, poker)
└── site/                   # Angular 20 SPA (Ionic)
    ├── src/app/            # pages, components, services, guards
    ├── lib/games/          # Self-contained game packages (pankov, poker)
    ├── lib/common/         # Reusable game widgets (dice, french-card, player-chip)
    └── public/             # Static assets (manifest.webmanifest, …)
```

## How games work

Each game lives in `site/lib/games/<name>/` as a self-contained package that exports a standalone game component implementing the `GameComponent` interface. Games are registered in `site/lib/game-registry.ts`: `GAME_REGISTRY` is a `Record<GameType, GameDescriptor>` where each descriptor carries the metadata **and** the `component`, which `RoomPlayComponent` mounts dynamically. Adding a game requires no changes to the core room/play flow.

TypeScript path aliases make imports clean:

```typescript
import { PankovGameComponent } from '@gandogames/lib/games/pankov';
import { PokerGameComponent } from '@gandogames/lib/games/poker';
```

## Data storage

No external database. Azure PlayFab covers all needs at this scale:

| Need | PlayFab API |
|---|---|
| Auth | Login / Register with email, or guest login with a custom ID |
| Rooms & game state | SharedGroups (JSON documents) |
| Profile & guest registry | User data / title internal data |

## API

The Azure Functions API is a secure proxy to PlayFab — `PLAYFAB_SECRET_KEY` never leaves the server.
Endpoints are registered with `registerPublicFunction` (no auth) or `registerFunction` (validates `sessionTicket` and injects the `GamePlayer`) from `api/src/index.ts`; `registerBaseFunction` and `registerTimeFunction` cover the SignalR negotiate and cron cases.
Handlers (`InnerFunction<TReq, TRes>`) return the response body directly or throw to produce an error; set `notifier.errorCode` before throwing to control the status code, and call `notifier` methods (e.g. `notifier.roomUpsert(...)`) to broadcast SignalR events after a successful response.

## Auth flow

1. User submits login/register form → `POST /api/auth/login` or `/api/auth/register`
2. Azure Function calls PlayFab Client API, returns `{ SessionTicket, PlayFabId }`
3. Angular stores the session ticket and passes it in subsequent requests for identity verification

## Games

| ID | Name | Path alias |
|---|---|---|
| `pankov` | Pankov | `@gandogames/lib/games/pankov` |
| `poker` | Texas Hold'em | `@gandogames/lib/games/poker` |

## Local development

```bash
# Angular dev server (from site/)
cd site && npm install && ng serve        # → http://localhost:1212

# Azure Functions dev server (from api/)
cd api && npm install && func start       # → http://localhost:7071

# Run both behind Azure SWA CLI (from repo root)
swa start http://localhost:1212 --api-location api
```

## Run the backend without secrets (mock mode)

Collaborators without the PlayFab/SignalR secrets can still run the **entire** stack locally. Set `MOCK_BACKEND=true` and the API swaps the PlayFab SDK for an in-memory simulation (`api/src/db/mockPlayFab.ts`). All real room/game/chat/friends logic runs unchanged — only the data + auth backend is faked. No secrets, no Azure resources.

**One-time:** install the [Azure SignalR Emulator](https://learn.microsoft.com/azure/azure-signalr/signalr-howto-emulator) for local real-time push (requires the .NET SDK):

```bash
dotnet tool install -g Microsoft.Azure.SignalR.Emulator
```

**Each run:**

```bash
# 1. Seed the mock settings (already contains MOCK_BACKEND=true + the emulator connection string)
cp api/local.settings.sample.json api/local.settings.json

# 2. Start the SignalR emulator on its default port 8888 (matches the committed connection string)
asrs-emulator start

# 3. Start the API — loads MOCK_BACKEND=true from local.settings.json → in-memory PlayFab
cd api && npm install && npm start        # → http://localhost:7071

# 4. Start the frontend
cd site && npm install && ng serve         # → http://localhost:1212
```

Open http://localhost:1212 — guest login, registration, rooms, games, chat, and friends all work against the in-memory backend.

**Notes**

- State lives in the `func` process: guest login is stable (the id derives from the browser's guest id), but registered accounts, rooms, and friend edges reset when `func` restarts.
- Session tickets are stateless, so a restart never logs you out.
- If real-time updates don't arrive, confirm the emulator is running. If it prints a connection string with a different `AccessKey`, copy that exact string into `AzureSignalRConnectionString` in `api/local.settings.json`.
- To use the real backend instead, omit `MOCK_BACKEND` and supply the PlayFab secrets (below). `api/local.settings.json` is gitignored.

## Environment setup

### Angular (`site/src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  apiBaseUrl: '/api',   // the dev server proxies /api → http://localhost:7071 (site/proxy.conf.json)
};
```

### Azure Functions (`api/local.settings.json`) — never commit this file

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "PLAYFAB_TITLE_ID": "YOUR_TITLE_ID",
    "PLAYFAB_SECRET_KEY": "YOUR_SECRET_KEY",
    "AzureSignalRConnectionString": "Endpoint=https://<your-signalr>.service.signalr.net;AccessKey=...;Version=1.0;"
  }
}
```

> No secrets? Use the mock backend instead — see [Run the backend without secrets](#run-the-backend-without-secrets-mock-mode).

## Adding a new game

1. Create `site/lib/games/<name>/` with a game component implementing the `GameComponent` interface, exported from its `index.ts`.
2. No tsconfig change needed — the `@gandogames/lib/*` alias already resolves `site/lib/*`, so `@gandogames/lib/games/<name>` works.
3. Register the game in `site/lib/game-registry.ts` — add a `GAME_REGISTRY` entry (metadata + the `component`).
4. Add the server-side logic under `api/src/games/` and wire it into `Game.Factory`.

When building game UI, reuse or extend the shared widgets in `site/lib/common/` (dice, cards, chips) where sensible — see the component-reuse rule in `CLAUDE.md`.

## Deployment

Hosted on Azure — the site on **Azure Static Web Apps**, the API on the **`GandoGamesApi`** Azure Functions app. Deploys run from GitHub Actions (`.github/workflows/`) and are **path-filtered**, so only the changed package deploys.

**Production** — push to `master`:
- changes under `site/**` → `deploy-site.yml` builds, tests, and deploys the site to Static Web Apps (production).
- changes under `api/**` → `deploy-api.yml` builds, tests, and deploys the API to the `GandoGamesApi` Function App (Azure login via OIDC).

**Staging** — push to `staging`:
- changes under `site/**` → `deploy-site-staging.yml` deploys the site to the Static Web Apps `staging` environment. (There is no API staging deploy.)

**PR previews** — open a PR against `develop`:
- `pr-preview.yml` builds and unit-tests **both** packages (the merge gate), then provisions a disposable per-PR environment — an ephemeral Function App for the API and a Static Web Apps preview for the site — and comments both URLs on the PR. Everything is torn down when the PR closes.

All three deploy workflows can also be triggered manually via **`workflow_dispatch`**. (A PR to `master` touching `site/**` also publishes a Static Web Apps preview, closed when the PR closes.)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — how to set up, develop, and submit changes (branch from `develop`, open a PR, CI gate + maintainer review).
