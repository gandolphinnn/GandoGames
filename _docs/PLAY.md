# Play

## `/play`

Lists rooms for all games. Shows a filter to toggle per-game visibility.  
Rooms update in real-time via SignalR (`roomUpsert`, `roomDeleted` events).  
Initial load fetches all rooms via `POST /rooms/list`.

---

## `/play/:roomId` — RoomDetailComponent

Single route, single component for the full room lifecycle. Behaviour varies by `room.phase`.

### `waiting` — Lobby

- Loads room via `POST /rooms/get` on init.
- Updates reactively via `roomUpsert` / `roomDeleted` SignalR events.
- **Join** — visible if room is `waiting`, user is not already in it, and player count < max.
- **Start** — visible to host only if room is `waiting` and player count ≥ min.
- **Leave** — navigates back to `/play` and notifies the API.
- On any navigation away or tab close, calls `leaveRoom` (beacon fetch with `keepalive: true` on unload).

### `playing` — Game

When `phase` changes to `playing`, `RoomDetailComponent` gives the full viewport to the correct game component using `NgComponentOutlet`. The game component to render is resolved from a game-to-component registry keyed by `room.game` (e.g. `'morra'` → `MorraGameComponent`).

**Transition triggers:**
- **Host**: `rooms/start` returns success → `RoomDetailComponent` switches to game view immediately.
- **Non-host**: `roomUpsert` SignalR event arrives with `phase: 'playing'` → same switch.

There is no URL change. The route stays `/play/:roomId` throughout.

### `ended` — Game over

Handled inside the game component itself (game-over phase). The component shows the result and offers a way back to `/play`.

---

## Game components

Each game package (`site/lib/games/<name>/`) exports a standalone game component (e.g. `MorraGameComponent`). This component:

- Receives `roomId` as an input (passed by `RoomDetailComponent` via `NgComponentOutlet`).
- Does **not** poll. All state updates arrive via the `gameStateUpdated` SignalR event, which carries the full updated game state as its payload.
- Sends player actions via `POST /game/action`.
- Takes over the full viewport — `RoomDetailComponent` renders nothing else while the game is active.

### Backend contract

`/game/state` and `/game/action` are game-agnostic. The backend reads `game` from the request, passes it to `Game.Factory`, and delegates all logic to the concrete class (e.g. `MorraGame`) that extends the abstract `Game` class. The frontend game component only needs to know its own state shape (e.g. `MorraGameState`) and action names.

---

## Direct URL access to a playing room

If a player navigates directly to `/play/:roomId` while a game is in progress:

- **Not in the room** → redirect to `/play`.
- **In the room** → `RoomDetailComponent` loads, detects `phase === 'playing'`, renders the game component. The game component receives its first full state from the next `gameStateUpdated` SignalR event.
