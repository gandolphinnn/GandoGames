# Structure

## Monorepo layout

```
GandoGames/
├── shared/              # Shared HTTP-contract types (site + api), imported as @gandogames/shared/api
│   ├── index.ts         # Re-exports shared/src/*
│   └── src/             # auth · room · game · signalr · friends
├── site/                # Angular 20 SPA (standalone components + Ionic)
│   ├── src/app/
│   │   ├── pages/       # Routed components (about, auth/*, home/*)
│   │   ├── components/  # Shared UI (chat, toast, player-avatar, …)
│   │   ├── services/    # Injectable services
│   │   └── guards/      # authGuard / noAuthGuard
│   └── lib/
│       ├── games/       # Self-contained game packages (pankov, poker)
│       ├── common/      # Reusable game widgets (dice, french-card, player-chip)
│       ├── game-registry.ts   # Game metadata, GameComponent interface + component registry
│       └── player-icons.ts
└── api/                 # Azure Functions v4 (TypeScript)
    └── src/
        ├── index.ts     # Barrel: register wrappers, pfPromise, PlayFab clients, SignalR bindings
        ├── functions/   # http/ (one file per concern) + cron/
        ├── db/          # PlayfabCtx (SharedGroup storage) + mockPlayFab (in-memory, MOCK_BACKEND)
        └── games/       # Server-side game logic (Game.Factory, PankovGame, PokerGame)
```

## API pattern

Each function file calls a register wrapper from `index.ts`:
- `registerPublicFunction` — no auth
- `registerFunction` — validates `sessionTicket` via PlayFab and injects the resolved `GamePlayer`
- `registerBaseFunction` — raw handler with the SignalR output binding (used for `signalr/negotiate`)
- `registerTimeFunction` — timer-triggered (cron)

To broadcast real-time events, call the `InnerFunctionNotifier` methods inside a handler (e.g. `notifier.roomUpsert(room)`, `notifier.gameStateUpdatedForPlayer(...)`, `notifier.addToGroup(...)`). Queued messages are flushed to the SignalR output binding after a successful response.

PlayFab access goes through `PlayfabCtx` (rooms + game state in SharedGroups) and the re-exported `PlayFabClient` / `PlayFabServer` / `PlayFabAdmin`. With `MOCK_BACKEND=true` those clients are swapped for an in-memory simulation (`db/mockPlayFab.ts`) so the API runs with no secrets — see the README.

## Site services (`src/app/services/`)

- `UserService` — `user` signal; login / register / guest / logout; session ticket persisted in `localStorage` (via `StorageService`); debounced profile updates
- `BackendService` — HTTP wrapper: `get()`, `post()`, `postBeacon()` (fire-and-forget on page unload)
- `RoomService` — `rooms` / `myRooms` / `browsableRooms` signals; CRUD methods; reacts to SignalR room events
- `SignalRService` — `HubConnection` lifecycle; auto-connects when a user logs in; exposes `events` Subjects
- `FriendService` — `friends` / `incoming` / `outgoing` signals + `pendingCount`; reacts to `friendRequest` / `friendsChanged`
- `StorageService` — typed `localStorage` wrapper
- `ToastService` — toasts and confirm prompts

## Data flow

```
User action → RoomService.method() → BackendService.post() → Azure Function
                                                                  ↓
                                                  InnerFunctionNotifier broadcast
                                                                  ↓
                                              SignalRService.events → RoomService signal update
```
