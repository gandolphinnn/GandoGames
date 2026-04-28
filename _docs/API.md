# API

Base URL (local): `http://localhost:7071/api`

All endpoints are `POST` unless noted. Auth is handled via `sessionTicket` in the request body. Errors return `{ "error": "<message>" }`.

---

## Alive

### `GET /alive`
```json
{ "status": "alive" }
```

---

## Auth

All auth endpoints are unauthenticated. Successful responses include `{ player: { id, name }, sessionTicket }`.

### `POST /auth/login`
```json
{ "email": "string", "password": "string" }
```

### `POST /auth/register`
```json
{ "email": "string", "password": "string", "username": "string" }
```
**201** on success.

### `POST /auth/guestLogin`
```json
{ "customId": "string" }
```

---

## Rooms

All room endpoints require `sessionTicket`.

### `POST /rooms/list`
Returns all open rooms. Body: `{ sessionTicket }`. Response: `RoomData[]`.

### `POST /rooms/create`
```json
{ "sessionTicket": "string", "game": "GameType", "name": "string" }
```
**201** — returns `RoomData`. Broadcasts `roomUpsert` via SignalR.

### `POST /rooms/get`
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Returns `RoomData`.

### `POST /rooms/join`
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Returns `RoomData`. Broadcasts `roomUpsert` via SignalR.

### `POST /rooms/start`
Host only. Requires ≥ min players for the game.
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Returns `RoomData`. Broadcasts `roomUpsert` via SignalR.

### `POST /rooms/leave`
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Broadcasts `roomUpsert` or `roomDeleted` via SignalR.

---

## Game

### `POST /game/state`
```json
{ "sessionTicket": "string", "roomId": "string", "game": "GameType" }
```
Returns `GameState | null`.

### `POST /game/action`
```json
{ "sessionTicket": "string", "roomId": "string", "game": "GameType", "action": "string", "data": "any" }
```
Returns `GameState | null`. Broadcasts `gameStateUpdated` to the room group via SignalR.

---

## SignalR

### `POST /negotiate?userId=<playFabId>`
Authenticates the session ticket and returns Azure SignalR hub connection info.
```json
{ "sessionTicket": "string" }
```
**Response:** `{ "url": "string", "accessToken": "string" }`

---

## Shared types (`common/src/`)

```ts
type GameType = 'morra' | 'pankov'

interface GamePlayer { id: string; name: string }
interface GameState { lastUpdate: Date }
interface RoomData {
  id: string; name: string; hostId: string;
  game: GameType; players: GamePlayer[];
  phase: 'waiting' | 'playing' | 'ended'
}
```
