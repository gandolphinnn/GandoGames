# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

```
GandoGames/
├── shared/
│   ├── index.ts               # Re-exports all shared types (imported as @gandogames/shared/dto)
│   └── dto/                   # Shared HTTP/SignalR contract used by both site/ and api/
│       ├── endpoints.ts       # THE API CONTRACT (SSOT): every endpoint's name, method, route + req/res/query types
│       ├── auth.ts            # AuthResponse, GamePlayer, ProfileData, Login/Register/GuestLoginRequest
│       ├── room.ts            # RoomData, RoomSummary, RoomCreateRequest, ChatMessage
│       ├── game.ts            # GameType, GameState, GameStateRequest, GameActionRequest
│       ├── signalr.ts         # NegotiateResponse/NegotiateQuery, SignalR event contract (SignalREventArgs)
│       └── friends.ts         # Friend, FriendsListResponse
├── site/                      # Angular 20 SPA + Ionic (Azure Static Web Apps)
│   ├── src/app/               # pages, components, services, guards
│   ├── lib/games/             # Self-contained game packages (pankov, poker)
│   ├── lib/common/            # Reusable game widgets (french-card, chips, game-table, player-avatar)
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

**Site (Karma/Jasmine):** `site/src/app/services/test/*.spec.ts` for Angular services. Config via `angular.json` + `tsconfig.spec.json`. Run with `ng test`.

**E2E (Playwright):** `site/e2e/*.spec.ts`. All API calls are route-intercepted — no live backend needed. Config in `site/playwright.config.ts`. Install browsers once with `npx playwright install chromium` from `site/`.

## Site (Angular)

Angular 20 standalone app (no NgModules). Entry point: `src/main.ts` bootstraps `App` from `src/app/app.component.ts`.

**UI:** Built with Ionic standalone components (imported per-component from `@ionic/angular/standalone`). Routed page components set `host: { class: 'ion-page' }`; the root `App` shell provides a side menu (`ion-menu`, content in `gg-side-menu`) + `ion-router-outlet`. Register `ion-icon` glyphs with `addIcons({ … })` from `ionicons`.

**Component prefix:** `gg-` (e.g. `gg-app`, `gg-login`). The root element in `src/index.html` must match the root component's selector.

**Styles:** SCSS (`.scss` syntax). `stylePreprocessorOptions.includePaths: ["src"]` is set, so any component can `@use 'styles/variables' as *` without a relative path.

**CSS naming:** Use hyphens only — no underscores. Single hyphens throughout: `.block`, `.block-element`, `.block-modifier`. Never use `__` or `--` (e.g. `.btn-primary` not `.btn--primary`, `.panel-title` not `.panel__title`).

**Responsiveness:** All components must be mobile-first. Use `@media (min-width: $bp-sm)` (defined in `src/styles/_variables.scss`) to scale up for larger screens. Touch targets must be at least 44×44 px.

**i18n (ngx-translate):** Every user-facing string is a translation key — never hardcode UI text. Languages: `en` (default/fallback) and `it`, in `src/i18n/en.json` + `src/i18n/it.json` (bundled at build time via `StaticTranslateLoader` — no HTTP fetch). Keep the two files' key sets identical. Keys are `UPPER_SNAKE` per dot-segment (`LOBBY.KICK_CONFIRM`). In templates use the `translate` pipe (`{{ 'LOBBY.JOIN' | translate }}`, params: `{{ 'LOBBY.KICK_CONFIRM' | translate: { name } }}`; `TranslatePipe` is already in `ION_IMPORTS`); in TS use `translate.instant('KEY', params) as string`. The active language follows the user profile (`UserService.language` effect). Deliberately NOT translated: API error messages, poker hand descriptions (`describeHand` is shared with the server's showdown results), and proper nouns (game names, "GandoGames").

**Path aliases** (`site/tsconfig.json`):
```
@gandogames/shared/dto  →  ../shared/index
@gandogames/shared/*    →  ../shared/games/*
@gandogames/lib/*       →  ./lib/*
@gandogames/services    →  ./src/app/services/_index   (barrel)
@gandogames/components  →  ./src/app/components/index  (barrel)
```

### Services

All in `src/app/services/`, imported via the `@gandogames/services` barrel (e.g. `import { RoomService } from '@gandogames/services'`). Every service — and any type its consumers need, re-exported with the `type` modifier (`isolatedModules`) — must be listed in `src/app/services/_index.ts`. Inside `src/app/services/` itself, services import each other with relative paths, never through the barrel (avoids import cycles).

- `UserService` — `user` signal; login/register/guest/logout; session ticket persisted in `localStorage`; debounced profile updates
- `BackendService` — `call(endpoint, options?)`, typed end-to-end by the shared API contract; adds the `Authorization: Bearer` header from the stored session ticket; surfaces any failed request's error message as a toast automatically before rethrowing
- `RoomService` — `rooms`/`myRooms`/`browsableRooms` signals, CRUD methods, subscribes to SignalR events for reactive updates
- `SignalRService` — manages HubConnection lifecycle (auto-connect on auth), exposes `events.roomUpsert`, `events.roomDeleted`, `events.gameStateUpdated`, `events.chatMessage`, `events.roomInvite`, `events.friendRequest`, `events.friendsChanged` as RxJS Subjects
- `FriendService` — `friends`/`incoming`/`outgoing` signals + `pendingCount`; reacts to friend SignalR events
- `UrlService` — the only place that touches `Router`/`ActivatedRoute`: never inject them elsewhere. `get(branch)` returns per-branch typed `navigate`/`urlTree`/`currentVariables` (derived from the `TREE` object); `current` url signal + `isActive(branch)`. New routes must be added to both `BranchName` and `TREE`
- `StorageService` — typed `localStorage` wrapper; `ToastService` — toasts and confirm prompts

**BackendService call pattern:** Every request goes through `call()` with an endpoint from the shared `API` map (`shared/dto/endpoints.ts`) — never a hand-written URL or method string. Route, method, params, body and response types all come from the endpoint definition; `params`/`body`/`query` are required (and typed) only when the endpoint declares them. Bodies still use a typed request variable rather than an inline literal. Callers never touch the session ticket — `BackendService` adds the `Authorization` header itself.
```ts
// correct
const request: ChatSendRequest = { text };
return this.backend.call(API.chat.send, { params: { roomId }, body: request });

// correct — endpoint with no input
const result = await this.backend.call(API.rooms.list);

// wrong — raw URL/method, inline body, hand-passed ticket
await this.backend.post('/chat/send', { sessionTicket: this.ticket, roomId, text });
```

**Error toasts:** `BackendService` already shows the API's error message as a toast on every failed call (before rethrowing). Never call `toast.error`/`warning`/`show` for the same error in a caller's `catch` — that double-toasts. In a `catch` after a backend call, only handle control flow (skip navigation, reset a loading flag). There is no per-call opt-out today; if a call must NOT toast on error, add that capability deliberately rather than working around it at the call site.

### Game packages

Games live in `site/lib/games/<name>/`, each with an `index.ts` as its public API that exports a standalone game component implementing the `GameComponent` interface (`site/lib/game-registry.ts`). Games are imported via the `@gandogames/lib/*` path alias and mounted dynamically by `RoomPlayComponent` — they are not routed.

To add a new game: create `site/lib/games/<name>/index.ts` exporting the game component, then register it in `site/lib/game-registry.ts` by adding a `GameDescriptor` (metadata + the `component`) to `GAME_REGISTRY`. Add the server-side logic under `api/src/games/` and wire it into `Game.Factory`. The `@gandogames/lib/*` alias already resolves `site/lib/*`, so no `tsconfig` change is needed.

**Reusable game components:** When developing a new game, decide whether a game component might be usable in the future by other games or existing ones. If so, try to use common components in `site/lib/common`; if there isn't one already, try to add it. Examples are: cards, poker fiches, table layouts… (the existing `french-card`, `chips`, `game-table`, and `player-avatar` widgets already live there).

## API (Azure Functions)

`api/` is an Azure Functions v4 TypeScript app. Secure proxy to PlayFab — `PLAYFAB_SECRET_KEY` never reaches the client.

**API contract (`shared/dto/endpoints.ts`):** the single source of truth for every endpoint — Azure Function name, HTTP method, route template and request/response/query types. Both sides consume it: the api registers functions from it, the site calls through it. Method conventions: GET for safe reads (ids in the path), QUERY for safe reads carrying a JSON body (`game/state`), POST for creations/actions, PUT for idempotent sub-resource replacement, PATCH for partial updates, DELETE for removals. Authentication is the `Authorization: Bearer <sessionTicket>` header — bodies never carry the ticket, and ids travel as `{param}` path segments. Never give two functions overlapping route templates on the same method (e.g. `players/me` vs `players/{playerId}`): the Functions host resolves routes without literal-over-parameter precedence.

**Barrel (`api/src/index.ts`):**

- `registerPublicEndpoint(def, fn)` — unauthenticated endpoint built from a contract definition; includes SignalR output binding
- `registerEndpoint(def, fn)` — authenticates the `Authorization: Bearer` ticket via PlayFab before calling `fn(body, params, notifier, player)`; unsafe methods (non GET/QUERY) on routes carrying `{roomId}` run under the per-room lock automatically
- `registerBaseEndpoint(def, handler, extraInputs?)` — raw handler with the SignalR output binding; used for `signalr/negotiate` (with the `signalRConnectionInfo` input binding)
- `registerTimeFunction(name, cron, runOnStartup, fn)` — timer-triggered (cron) function
- `InnerFunctionNotifier` — passed to every handler; set `errorCode`/`errorMessage` to shape errors, and call its methods (`roomUpsert`, `gameStateUpdatedForPlayer`, `addToGroup`, …) to queue SignalR broadcasts sent after a successful response
- `pfPromise<T>(call)` — wraps PlayFab SDK callbacks into Promises
- `PlayFabClient`, `PlayFabServer`, `PlayFabAdmin` — re-exported (in-memory mocks when `MOCK_BACKEND=true`)

**SignalR:** Azure SignalR Service in serverless mode. `signalROutput` output binding on all registered functions. Broadcast by calling `InnerFunctionNotifier` methods (e.g. `notifier.roomUpsert(room)`), which queue `SignalRMessage`s flushed to the binding after a successful response.

**Shared types:** `shared/index.ts` (imported as `@gandogames/shared/dto`) is the single source of truth for all HTTP request/response shapes; `shared/dto/endpoints.ts` binds each shape to its endpoint (method + route).

**Data storage:** PlayFab SharedGroups store room and game state. PlayFab is also used for auth.

**Secrets:** `PLAYFAB_TITLE_ID`, `PLAYFAB_SECRET_KEY`, and `AzureSignalRConnectionString` go in `api/local.settings.json` locally (gitignored) and in Azure Function App settings in production. Never commit secrets. To run locally without any secrets, set `MOCK_BACKEND=true` (copy `api/local.settings.sample.json`) — the PlayFab clients are swapped for an in-memory simulation (`api/src/db/mockPlayFab.ts`).
