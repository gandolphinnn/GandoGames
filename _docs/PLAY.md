# Play

## `/play` — RoomListComponent

Lists rooms for all games. Shows a per-game filter to toggle visibility, and separates the caller's own active rooms from the browsable list.
Rooms update in real-time via SignalR (`roomUpsert`, `roomDeleted`).
Initial load fetches rooms via `POST /rooms/list`. Creating a room happens on `/play/new` (`RoomNewComponent`).

---

## `/play/:roomId` — RoomDetailComponent

A single component for the full room lifecycle. Behaviour varies by `room.phase`.

### `waiting` — Lobby

- Loads the room via `POST /rooms/get` on init.
- Updates reactively via `roomUpsert` / `roomDeleted` SignalR events.
- **Join** — visible if the room is `waiting`, the user is not already in it, not kicked, and player count < max.
- **Start** — host only, visible if `waiting` and player count ≥ min.
- **Leave** — notifies the API (`/rooms/leave`) and navigates back to `/play`.
- **Close** — host only; deletes the room for everyone (`/rooms/delete`).
- **Kick** — host only (`/rooms/kick`).
- **Invite** — host only; opens the invite modal to invite an online player (`/rooms/invite`).
- Players can send a friend request to other registered players from the lobby.

### `playing` — Game

When `phase` is `playing`, `RoomDetailComponent` renders `<gg-room-play>` (`RoomPlayComponent`), which gives the game the full viewport. `RoomPlayComponent` resolves the game component from the `GAME_REGISTRY` entry (keyed by `room.game`) and **dynamically mounts it** via `ViewContainerRef.createComponent` — there is no per-game route.

**Transition triggers:**
- **Host**: `rooms/start` succeeds → the room signal flips to `playing` → switch.
- **Non-host**: a `roomUpsert` SignalR event arrives with `phase: 'playing'` → same switch.

There is no URL change — the route stays `/play/:roomId` throughout.

### `ended` — Game over

Handled inside the game component (game-over UI). It can emit `playAgain` (host → `POST /rooms/reset`, back to the lobby) or `back` (→ `/play`).

---

## Game components

Each game package (`site/lib/games/<name>/`) exports a standalone component implementing the `GameComponent` interface (`site/lib/game-registry.ts`). The component is **driven by `RoomPlayComponent`**, not by direct backend access:

- **Inputs** (set by `RoomPlayComponent`): `gameState`, `loading`, `error`, `myPlayFabId`.
- **Outputs** (handled by `RoomPlayComponent`): `gameAction` → `POST /game/action`, `back` → navigate to `/play`, `playAgain` → `POST /rooms/reset`.
- Does **not** poll. State arrives via the `gameStateUpdated` SignalR event (plus an initial `POST /game/state`), which `RoomPlayComponent` feeds into the `gameState` input.
- Takes over the full viewport while active.

### Backend contract

`/game/state` and `/game/action` are game-agnostic. The backend reads `game` from the request, passes it to `Game.Factory`, and delegates to the concrete class (e.g. `PankovGame`, `PokerGame`) that extends the abstract `Game`. The frontend game component only needs to know its own state shape (e.g. `PankovGameState`) and action names.

### Registries

- `GAME_REGISTRY` (`site/lib/game-registry.ts`) — a `Record<GameType, GameDescriptor>`; each descriptor holds the metadata (`id`, `name`, `icon`, `description`, `minPlayers`, `maxPlayers`) **and** the `component` to mount.

---

## Direct URL access to a playing room

If a player navigates directly to `/play/:roomId` while a game is in progress:

- **Not in the room** → redirect to `/play`.
- **In the room** → `RoomDetailComponent` loads, detects `phase === 'playing'`, and mounts the game component, which receives its first state from `POST /game/state` (or the next `gameStateUpdated` event).
