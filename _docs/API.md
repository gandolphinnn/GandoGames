# API

Base URL (local): `http://localhost:7071/api` (the Angular dev server proxies `/api` here — see `site/proxy.conf.json`).

All endpoints are `POST` unless noted. Authenticated endpoints take `sessionTicket` in the request body; the wrapper validates it via PlayFab and injects the resolved `GamePlayer`. Success responses are `200`. Errors return `{ "error": "<message>" }` with an endpoint-specific status (commonly `400`, `401`, `404`, or `500`).

Request/response shapes are the shared types in `shared/dto/` (imported as `@gandogames/shared/dto`).

---

## Alive

### `GET | POST /alive`
```json
{ "status": "alive" }
```

---

## Auth

Unauthenticated except `/auth/check`. Successful responses are an `AuthResponse`: `{ player: GamePlayer, sessionTicket: string }`.

### `POST /auth/login`
```json
{ "email": "string", "password": "string" }
```

### `POST /auth/register`
```json
{ "email": "string", "password": "string", "username": "string" }
```

### `POST /auth/guestLogin`
```json
{ "customId": "string" }
```
Logs in (creating the account on first use) as a guest. `player.isGuest` is `true`.

### `POST /auth/check`
```json
{ "sessionTicket": "string" }
```
Re-validates an existing ticket and returns the current `AuthResponse`. Used to restore a session on app start.

---

## Rooms

All room endpoints require `sessionTicket`. SignalR broadcasts are noted per endpoint.

### `POST /rooms/list`
Body: `{ sessionTicket }`. Returns `RoomSummary[]` — rooms active in the last hour, excluding ones the caller was kicked from. (The client splits these into the caller's own rooms vs. browsable rooms.)

### `POST /rooms/create`
```json
{ "sessionTicket": "string", "game": "GameType" }
```
Returns `RoomData`. The caller becomes host. Broadcasts `roomUpsert`.

### `POST /rooms/get`
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Returns `RoomData`. If the caller's icon changed since they joined, their room record is reconciled and a `roomUpsert` is broadcast (see `ICON-UPDATE.md`).

### `POST /rooms/join`
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Returns `RoomData`. Rejected if the game has started, the room is full, or the caller was kicked. Broadcasts `roomUpsert`.

### `POST /rooms/start`
Host only. Requires the player count to be within the game's min/max.
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Returns `RoomData` (`phase: 'playing'`). Initializes game state and broadcasts `roomUpsert` plus a per-player `gameStateUpdated`.

### `POST /rooms/reset`
Host only, while `playing`. Returns the room to `waiting`.
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Returns `RoomData`. Broadcasts `roomUpsert`.

### `POST /rooms/leave`
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Returns `void`. If the caller was the last player the room is deleted (`roomDeleted`); otherwise host is reassigned as needed and `roomUpsert` is broadcast.

### `POST /rooms/kick`
Host only, while `waiting`.
```json
{ "sessionTicket": "string", "roomId": "string", "playerId": "string" }
```
Returns `RoomData`. Broadcasts `roomDeleted` to the kicked player and `roomUpsert` to the rest.

### `POST /rooms/invite`
Host only, while `waiting`. Targets a friend by their PlayFab id.
```json
{ "sessionTicket": "string", "roomId": "string", "friendId": "string" }
```
Returns `void`. Broadcasts `roomInvite` to the target.

### `POST /rooms/delete`
Host only.
```json
{ "sessionTicket": "string", "roomId": "string" }
```
Returns `void`. Broadcasts `roomDeleted`.

---

## Game

Both endpoints are game-agnostic: the backend reads `game`, resolves the concrete class via `Game.Factory`, and delegates.

### `POST /game/state`
```json
{ "sessionTicket": "string", "roomId": "string", "game": "GameType" }
```
Returns the caller's view of `GameState | null`.

### `POST /game/action`
```json
{ "sessionTicket": "string", "roomId": "string", "game": "GameType", "action": "string", "data": "any" }
```
Applies the action and returns the caller's `GameState | null`. Broadcasts a per-player `gameStateUpdated` and a `roomUpsert`.

---

## Chat

### `POST /chat/send`
```json
{ "sessionTicket": "string", "roomId": "string", "text": "string" }
```
Returns `void`. Appends the message to the room and broadcasts `chatMessage` to the room group. Caller must be in the room; text is 1–500 chars.

---

## Profile

### `POST /profile/get`
Body: `{ sessionTicket }`. Returns `ProfileData` (`{ icon, theme, language }`).

### `POST /profile/update`
```json
{ "sessionTicket": "string", "icon": "IconType?", "theme": "Theme?", "language": "LangCode?" }
```
Updates the provided preference fields and returns the full `ProfileData`. Does not touch room state (icon changes propagate lazily — see `ICON-UPDATE.md`).

### `POST /profile/delete`
Body: `{ sessionTicket }`. Returns `void`. Permanently deletes the player.

---

## Friends

All require `sessionTicket`. Friending is a registered-user-only feature.

### `POST /friends/list`
Body: `{ sessionTicket }`. Returns `FriendsListResponse` — `{ friends, incoming, outgoing }`.

### `POST /friends/request`
```json
{ "sessionTicket": "string", "friendId": "string" }
```
Returns `void`. Sends (or auto-accepts a reciprocal) request. Broadcasts `friendRequest` / `friendsChanged` to the target.

### `POST /friends/accept`
```json
{ "sessionTicket": "string", "friendId": "string" }
```
Returns `void`. Accepts a pending incoming request. Broadcasts `friendsChanged` to the target.

### `POST /friends/remove`
```json
{ "sessionTicket": "string", "friendId": "string" }
```
Returns `void`. Declines an incoming request, cancels an outgoing one, or unfriends. Broadcasts `friendsChanged` to the target.

---

## SignalR

### `POST /signalr/negotiate?userId=<playFabId>`
Validates the session ticket (the `userId` query param must match it) and returns Azure SignalR connection info.
```json
{ "sessionTicket": "string" }
```
**Response:** `NegotiateResponse` — `{ "url": "string", "accessToken": "string" }`

### Broadcast events
Server-to-client events pushed over the hub (`SignalREventType`):
`roomUpsert`, `roomDeleted`, `gameStateUpdated`, `chatMessage`, `roomInvite`, `friendRequest`, `friendsChanged`.

---

## Shared types (`shared/dto/`)

```ts
type GameType = 'pankov' | 'poker'
type Theme    = 'dark' | 'light'
type LangCode = 'en' | 'it'
type IconType = 'profile' | 'luck' | 'cookie' | 'paw' | 'pizza' | 'bot'

interface ProfileData { theme: Theme; icon: IconType; language: LangCode }

interface GamePlayer extends ProfileData {
  id: string; name: string; isGuest: boolean
}

interface RoomSummary {
  id: string; hostId: string; game: GameType;
  players: GamePlayer[]; phase: 'waiting' | 'playing' | 'ended'
}
interface RoomData extends RoomSummary {
  kickedPlayers: string[]; chat: ChatMessage[]; lastUpdate: Date
}

interface ChatMessage { playerId: string; playerName: string; text: string; timestamp: Date }
interface GameState  { lastUpdate: Date }   // games extend this (e.g. PankovGameState)

interface Friend { id: string; name: string; icon: IconType }
interface FriendsListResponse { friends: Friend[]; incoming: Friend[]; outgoing: Friend[] }

interface AuthResponse { player: GamePlayer; sessionTicket: string }
```
