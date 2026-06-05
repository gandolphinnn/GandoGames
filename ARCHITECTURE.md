# Architecture

```mermaid
graph TD
    Shared["shared/<br/>shared HTTP types"]

    subgraph Site["site/ — Angular 20 + Ionic SPA"]
        Pages["Pages<br/>room list · detail · play"]
        Svcs["Services<br/>User · Room · Friend · SignalR · Backend"]
        GamesUI["Games + widgets<br/>pankov · poker · lib/common/"]
        Pages --> Svcs
        Pages --> GamesUI
    end

    subgraph API["api/ — Azure Functions v4"]
        Fns["HTTP functions<br/>auth · rooms · game · chat · profile · friends"]
        DB["PlayfabCtx / mockPlayFab"]
        Fns --> DB
    end

    SignalR["Azure SignalR<br/>serverless push"]
    PlayFab["PlayFab<br/>auth · SharedGroups"]

    Shared -.-> Site
    Shared -.-> API
    Svcs -->|"HTTPS /api"| Fns
    Svcs <-->|WebSocket| SignalR
    Fns -->|broadcast| SignalR
    DB --> PlayFab
```

Notes:
- Client → server is HTTPS `POST /api/...`; server → client updates are pushed over Azure SignalR (no polling).
- The API is a stateless proxy: state lives in PlayFab SharedGroups via `PlayfabCtx`, swapped for an in-memory simulation when `MOCK_BACKEND=true`.
- Games aren't routed — `RoomPlayComponent` mounts the component from the game's `GAME_REGISTRY` entry and drives it via inputs/outputs.
