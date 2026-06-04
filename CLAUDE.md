# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

```
GandoGames/
├── shared/
│   ├── index.ts               # Re-exports all shared types (imported as @gandogames/shared/api)
│   └── src/                   # Shared HTTP contract types used by both site/ and api/
│       ├── auth.ts            # AuthResponse, GamePlayer, ProfileData, Login/Register/GuestLoginRequest
│       ├── room.ts            # RoomData, RoomSummary, RoomCreateRequest, ChatMessage
│       ├── game.ts            # GameType, GameState, GameBaseRequest, GameActionRequest
│       ├── signalr.ts         # NegotiateResponse, SignalREvent types
│       └── friends.ts         # Friend, FriendsListResponse, FriendBaseRequest
├── site/                      # Angular 20 SPA + Ionic (Azure Static Web Apps)
│   ├── src/app/               # pages, components, services, guards
│   ├── lib/games/             # Self-contained game packages (pankov, poker)
│   ├── lib/common/            # Reusable game widgets (dice, french-card, player-chip)
│   ├── lib/game-registry.ts   # Game metadata + GameComponent interface
│   └── public/                # Static assets (staticwebapp.config.json, manifest.webmanifest)
└── api/                       # Azure Functions v4 (TypeScript)
    └── src/
        ├── index.ts           # Barrel: register wrappers, pfPromise, PlayFab clients, SignalR bindings
        ├── functions/         # http/ (auth, rooms, game, chat, profile, friends, signalr, alive) + cron/
        ├── db/                # PlayfabCtx (SharedGroups) + mockPlayFab (in-memory)
        └── games/             # Server-side game logic (Game.Factory, pankov, poker)
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

**API (Jest):** `api/src/games/*.spec.ts` for game logic; `api/src/index.spec.ts` for `pfPromise` and `InnerFunctionNotifier`; `api/src/db/mockPlayFab.spec.ts` for the in-memory mock backend. Config in `api/package.json` (jest) + `api/tsconfig.spec.json`.

**Site (Karma/Jasmine):** `site/src/app/services/*.spec.ts` for Angular services. Config via `angular.json` + `tsconfig.spec.json`. Run with `ng test`.

**E2E (Playwright):** `site/e2e/*.spec.ts`. All API calls are route-intercepted — no live backend needed. Config in `site/playwright.config.ts`. Install browsers once with `npx playwright install chromium` from `site/`.

## Site (Angular)

Angular 20 standalone app (no NgModules). Entry point: `src/main.ts` bootstraps `App` from `src/app/app.component.ts`.

**UI:** Built with Ionic standalone components (imported per-component from `@ionic/angular/standalone`). Routed page components set `host: { class: 'ion-page' }`; the root `App` shell provides a side menu (`ion-menu`) + `ion-router-outlet`. Register `ion-icon` glyphs with `addIcons({ … })` from `ionicons`.

**Component prefix:** `gg-` (e.g. `gg-app`, `gg-login`). The root element in `src/index.html` must match the root component's selector.

**Styles:** SCSS (`.scss` syntax). `stylePreprocessorOptions.includePaths: ["src"]` is set, so any component can `@use 'styles/variables' as *` without a relative path.

**CSS naming:** Use hyphens only — no underscores. Single hyphens throughout: `.block`, `.block-element`, `.block-modifier`. Never use `__` or `--` (e.g. `.btn-primary` not `.btn--primary`, `.panel-title` not `.panel__title`).

**Responsiveness:** All components must be mobile-first. Use `@media (min-width: $bp-sm)` (defined in `src/styles/_variables.scss`) to scale up for larger screens. Touch targets must be at least 44×44 px.

**Path aliases** (`site/tsconfig.json`):
```
@gandogames/shared/api  →  ../shared/index
@gandogames/lib/*       →  ./lib/*
@gandogames/services/*  →  ./src/app/services/*
```

### Services

All in `src/app/services/`, imported via `@gandogames/services/<name>.service`.

- `UserService` — `user` signal; login/register/guest/logout; session ticket persisted in `localStorage`; debounced profile updates
- `BackendService` — `get()`, `post()`, `postBeacon()` (keepalive fetch for page-unload calls)
- `RoomService` — `rooms`/`myRooms`/`browsableRooms` signals, CRUD methods, subscribes to SignalR events for reactive updates
- `SignalRService` — manages HubConnection lifecycle (auto-connect on auth), exposes `events.roomUpsert`, `events.roomDeleted`, `events.gameStateUpdated`, `events.chatMessage`, `events.roomInvite`, `events.friendRequest`, `events.friendsChanged` as RxJS Subjects
- `FriendService` — `friends`/`incoming`/`outgoing` signals + `pendingCount`; reacts to friend SignalR events
- `StorageService` — typed `localStorage` wrapper; `ToastService` — toasts and confirm prompts

**BackendService call pattern:** Always specify the return type generic and always declare a typed request variable — never pass an inline object literal as the body. The only exception to `const result = await` is when immediately returning the call result.
```ts
// correct
const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
const result = await this.backend.post<RoomData>('/rooms/get', request);

// correct immediate return
const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
return this.backend.post<void>('/rooms/leave', request);

// wrong — no type generic, inline body
await this.backend.post('/rooms/leave', { sessionTicket: this.ticket, roomId });
```

### Game packages

Games live in `site/lib/games/<name>/`, each with an `index.ts` as its public API that exports a standalone game component implementing the `GameComponent` interface (`site/lib/game-registry.ts`). Games are imported via the `@gandogames/lib/*` path alias and mounted dynamically by `RoomPlayComponent` — they are not routed.

To add a new game: create `site/lib/games/<name>/index.ts` exporting the game component, then register it in `site/lib/game-registry.ts` by adding a `GameDescriptor` (metadata + the `component`) to `GAME_REGISTRY`. Add the server-side logic under `api/src/games/` and wire it into `Game.Factory`. The `@gandogames/lib/*` alias already resolves `site/lib/*`, so no `tsconfig` change is needed.

**Reusable game components:** When developing a new game, decide whether a game component might be usable in the future by other games or existing ones. If so, try to use common components in `site/lib/common`; if there isn't one already, try to add it. Examples are: dices, cards, poker fiches… (the existing `dice`, `french-card`, and `player-chip` widgets already live there).

## API (Azure Functions)

`api/` is an Azure Functions v4 TypeScript app. Secure proxy to PlayFab — `PLAYFAB_SECRET_KEY` never reaches the client.

**Barrel (`api/src/index.ts`):**

- `registerPublicFunction<TReq, TRes>(name, route, fn)` — unauthenticated POST; includes SignalR output binding
- `registerFunction<TReq extends BaseRequest, TRes>(name, route, fn)` — authenticates `sessionTicket` via PlayFab before calling `fn`; includes SignalR output binding
- `registerBaseFunction(name, route, handler, extraInputs?)` — raw handler with the SignalR output binding; used for `signalr/negotiate` (with the `signalRConnectionInfo` input binding)
- `registerTimeFunction(name, cron, runOnStartup, fn)` — timer-triggered (cron) function
- `InnerFunctionNotifier` — passed to every handler; set `errorCode`/`errorMessage` to shape errors, and call its methods (`roomUpsert`, `gameStateUpdatedForPlayer`, `addToGroup`, …) to queue SignalR broadcasts sent after a successful response
- `pfPromise<T>(call)` — wraps PlayFab SDK callbacks into Promises
- `PlayFabClient`, `PlayFabServer`, `PlayFabAdmin` — re-exported (in-memory mocks when `MOCK_BACKEND=true`)

**SignalR:** Azure SignalR Service in serverless mode. `signalROutput` output binding on all registered functions. Broadcast by calling `InnerFunctionNotifier` methods (e.g. `notifier.roomUpsert(room)`), which queue `SignalRMessage`s flushed to the binding after a successful response.

**Shared types:** `shared/index.ts` (imported as `@gandogames/shared/api`) is the single source of truth for all HTTP request/response shapes.

**Data storage:** PlayFab SharedGroups store room and game state. PlayFab is also used for auth.

**Secrets:** `PLAYFAB_TITLE_ID`, `PLAYFAB_SECRET_KEY`, and `AzureSignalRConnectionString` go in `api/local.settings.json` locally (gitignored) and in Azure Function App settings in production. Never commit secrets. To run locally without any secrets, set `MOCK_BACKEND=true` (copy `api/local.settings.sample.json`) — the PlayFab clients are swapped for an in-memory simulation (`api/src/db/mockPlayFab.ts`).
