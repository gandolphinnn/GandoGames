# Structure

## Monorepo layout

```
GandoGames/
├── common/          # Shared types (site + api)
├── site/            # Angular 20 SPA
│   ├── src/app/
│   │   ├── pages/   # Routed components
│   │   └── services/
│   └── lib/games/   # Self-contained game packages
└── api/             # Azure Functions v4
    └── src/
        ├── index.ts      # Register wrappers, shared utils
        └── functions/    # One file per concern
```

## API pattern

Each function file calls one of the register wrappers from `index.ts`:
- `registerPublicFunction` — no auth
- `registerFunction` — validates `sessionTicket` via PlayFab, injects `GamePlayer`
- `registerNegotiateFunction` — SignalR negotiate with `signalRConnectionInfo` input binding

Push `SignalRMessage` objects into `options.signalR` inside any handler to broadcast real-time events after a successful response.

## Site services

- `AuthService` — user signal (persisted in sessionStorage)
- `BackendService` — HTTP wrapper; `postBeacon()` for fire-and-forget on page unload
- `RoomService` — rooms signal; reacts to SignalR events; exposes CRUD methods
- `SignalRService` — HubConnection lifecycle; auto-connects when user logs in; exposes `events` Subjects

## Data flow

```
User action → RoomService.method() → BackendService.post() → Azure Function
                                                                  ↓
                                                         SignalR broadcast
                                                                  ↓
                                              SignalRService.events → RoomService signal update
```
