# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

```
GandoGames/
├── common/
│   ├── index.ts               # Re-exports all shared types (imported as @gandogames/common/api)
│   └── src/                   # Shared HTTP contract types used by both site/ and api/
│       ├── auth.ts            # AuthResponse, LoginRequest, RegisterRequest, GuestLoginRequest, BaseRequest
│       ├── room.ts            # RoomData, RoomCreateRequest, RoomBaseRequest
│       ├── game.ts            # GameType, GamePlayer, GameState, GameBaseRequest, GameActionRequest
│       └── signalr.ts        # NegotiateResponse, SignalREvent types
├── site/                      # Angular 20 SPA (Azure Static Web Apps)
│   ├── src/                   # App source
│   ├── lib/games/             # Self-contained game packages (morra, pankov)
│   └── public/                # Static assets (staticwebapp.config.json)
└── api/                       # Azure Functions v4 (TypeScript)
    └── src/
        ├── index.ts           # Barrel: register wrappers, pfPromise, PlayFabClient, PlayFabServer, SignalR output
        └── functions/         # One file per concern (auth, rooms, game, signalr, alive)
```

## Commands

Run from `site/`:
```bash
ng serve          # dev server on :1212
ng build          # production build → dist/
ng lint           # lint (if configured)
```

Run from `api/`:
```bash
npm run build     # tsc compile
func start        # local Functions host on :7071
npm test          # Jest unit tests (game logic, utilities)
```

Run from `site/`:
```bash
npm test          # Karma/Jasmine unit tests (services)
npm run test:e2e  # Playwright E2E tests (starts ng serve automatically)
```

## Tests

**API (Jest):** `api/src/games/*.spec.ts` for game logic; `api/src/index.spec.ts` for `pfPromise` and `InnerFunctionNotifier`. Config in `api/package.json` (jest) + `api/tsconfig.spec.json`.

**Site (Karma/Jasmine):** `site/src/app/services/*.spec.ts` for Angular services. Config via `angular.json` + `tsconfig.spec.json`. Run with `ng test`.

**E2E (Playwright):** `site/e2e/*.spec.ts`. All API calls are route-intercepted — no live backend needed. Config in `site/playwright.config.ts`. Install browsers once with `npx playwright install chromium` from `site/`.

## Site (Angular)

Angular 20 standalone app (no NgModules). Entry point: `src/main.ts` bootstraps `App` from `src/app/app.component.ts`.

**Component prefix:** `gg-` (e.g. `gg-app`, `gg-login`). The root element in `src/index.html` must match the root component's selector.

**Styles:** SCSS (`.scss` syntax). `stylePreprocessorOptions.includePaths: ["src"]` is set, so any component can `@use 'styles/variables' as *` without a relative path.

**CSS naming:** Use hyphens only — no underscores. Single hyphens throughout: `.block`, `.block-element`, `.block-modifier`. Never use `__` or `--` (e.g. `.btn-primary` not `.btn--primary`, `.panel-title` not `.panel__title`).

**Responsiveness:** All components must be mobile-first. Use `@media (min-width: $bp-sm)` (defined in `src/styles/_variables.scss`) to scale up for larger screens. Touch targets must be at least 44×44 px.

**Path aliases** (`site/tsconfig.json`):
```
@gandogames/common/api  →  ../common/index
@gandogames/lib/*       →  ./lib/*
@gandogames/services/*  →  ./src/app/services/*
```

### Services

All in `src/app/services/`, imported via `@gandogames/services/<name>.service`.

- `AuthService` — user signal, login/register/guest/logout
- `BackendService` — `get()`, `post()`, `postBeacon()` (keepalive fetch for page-unload calls)
- `RoomService` — rooms signal, CRUD methods, subscribes to SignalR events for reactive updates
- `SignalRService` — manages HubConnection lifecycle (auto-connect on auth), exposes `events.roomUpsert`, `events.roomDeleted`, `events.gameStateUpdated` as RxJS Subjects

### Game packages

Games live in `site/lib/games/<name>/`, each with an `index.ts` as its public API. They are imported via TypeScript path aliases. Each game exports an Angular `Routes` array that the main app lazy-loads.

To add a new game: create `site/lib/games/<name>/index.ts`, add a path alias to `site/tsconfig.json`, and register it in the game registry (`src/app/game-registry.ts`).

## API (Azure Functions)

`api/` is an Azure Functions v4 TypeScript app. Secure proxy to PlayFab — `PLAYFAB_SECRET_KEY` never reaches the client.

**Barrel (`api/src/index.ts`):**

- `registerPublicFunction<TReq, TRes>(name, route, fn)` — unauthenticated POST; includes SignalR output binding
- `registerFunction<TReq extends BaseRequest, TRes>(name, route, fn)` — authenticates `sessionTicket` via PlayFab before calling `fn`; includes SignalR output binding
- `registerNegotiateFunction(name, route)` — SignalR negotiate endpoint with `signalRConnectionInfo` input binding
- `InnerFunctionOptions` — `{ successCode?, errorCode?, errorMessage?, signalR: SignalRMessage[] }` — populate `signalR` to broadcast after a successful response
- `pfPromise<T>(call)` — wraps PlayFab SDK callbacks into Promises
- `PlayFabClient`, `PlayFabServer` — re-exported after settings are initialised

**SignalR:** Azure SignalR Service in serverless mode. `signalROutput` output binding on all registered functions. Push `SignalRMessage` objects into `options.signalR` to broadcast to users or groups.

**Shared types:** `common/index.ts` (imported as `@gandogames/common/api`) is the single source of truth for all HTTP request/response shapes.

**Data storage:** PlayFab SharedGroups store room and game state. PlayFab is also used for auth.

**Secrets:** `PLAYFAB_TITLE_ID`, `PLAYFAB_SECRET_KEY`, and `AzureSignalRConnectionString` go in `api/local.settings.json` locally (gitignored) and in Azure Function App settings in production. Never commit secrets.
