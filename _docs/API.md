# API

Base URL (local): `http://localhost:7071/api`

All endpoints are anonymous (no Azure-level auth key required). Authentication is handled via PlayFab `sessionTicket` in the request body where needed.

Errors return `{ "error": "<message>" }` with the relevant HTTP status code.

---

## Alive

### `GET /alive`
Returns server status.

**Response `200`**
```json
{ "status": "alive" }
```

---

## Auth

### `POST /auth/guestLogin`
Logs in as a guest using a device-local custom ID. Creates a new PlayFab account if none exists for that ID.

**Body**
```json
{ "customId": "string" }
```

**Response `200`**
```json
{ "SessionTicket": "string", "PlayFabId": "string" }
```

**Errors** `401` — invalid custom ID

---

### `POST /auth/login`
Logs in with email and password.

**Body**
```json
{ "email": "string", "password": "string" }
```

**Response `200`**
```json
{ "SessionTicket": "string", "PlayFabId": "string" }
```

**Errors** `401` — invalid credentials

---

### `POST /auth/register`
Creates a new account.

**Body**
```json
{ "email": "string", "password": "string", "username": "string" }
```

**Response `201`**
```json
{ "SessionTicket": "string", "PlayFabId": "string" }
```

**Errors** `400` — invalid registration data

---

## Rooms

Rooms are generic and game-agnostic. The `gameId` field determines which game's logic is used.

### `GET /rooms?gameId=<gameId>`
Lists all open rooms for the given game. Defaults to `pankov` if `gameId` is omitted.

**Response `200`**
```json
[
  {
    "roomId": "string",
    "players": ["string"],
    "createdAt": "ISO8601"
  }
]
```

---

### `POST /rooms`
Creates a new room.

**Body**
```json
{ "sessionTicket": "string", "playerName": "string", "gameId": "string" }
```

**Response `201`**
```json
{ "roomId": "string" }
```

**Errors** `400`

---

### `POST /rooms/join`
Joins an existing room by room code.

**Body**
```json
{ "sessionTicket": "string", "roomCode": "string", "playerName": "string" }
```

**Response `200`**
```json
{ "roomId": "string" }
```

**Errors** `400` — game already started / room full / already in room

---

### `GET /rooms/{roomId}`
Returns the current public state of a room. The shape of `gameState` depends on the game.

**Response `200`**
```json
{
  "phase": "waiting | playing | game-over",
  "hostId": "string",
  "gameId": "string",
  "players": [{ "playFabId": "string", "name": "string" }],
  "lastUpdated": "ISO8601",
  "gameState": "<game-specific — see below>"
}
```

**Errors** `404` — room not found

---

### `POST /rooms/{roomId}/start`
Starts the game. Host only. Requires ≥ 2 players.

**Body**
```json
{ "sessionTicket": "string" }
```

**Response `200`** — full room state (same shape as `GET /rooms/{roomId}`)

**Errors** `400`, `403` — not the host

---

### `POST /rooms/{roomId}/action`
Submits a game action. The request body and effect depend on `gameId` (see per-game sections below).

**Errors** `400`, `403`

---

## Game state shapes

### Pankov — `gameState`

```json
{
  "gamePhase": "turn-start | result | game-over",
  "currentPlayerIndex": 0,
  "previousDeclaration": "number | null",
  "previousPlayerIndex": "number | null",
  "revealResult": {
    "wasLying": true,
    "loserIndex": 0,
    "declared": 65,
    "actual": 32
  },
  "winnerName": "string | null",
  "players": [
    { "playFabId": "string", "name": "string", "lives": 8 }
  ]
}
```

#### Pankov actions (`POST /rooms/{roomId}/action`)

**declare**
```json
{ "sessionTicket": "string", "type": "declare", "declaration": 65, "actualRoll": 32 }
```
Current player declares a roll value (must be higher rank than the previous declaration) and submits their actual roll (hidden from others).

**call-false**
```json
{ "sessionTicket": "string", "type": "call-false" }
```
Current player challenges the previous declaration. Reveals the actual roll and determines who loses a life.

**next-turn**
```json
{ "sessionTicket": "string", "type": "next-turn" }
```
Any player advances past the reveal screen. Applies the life penalty and resets for the next turn.

---

### Morra — `gameState`

```json
{
  "gamePhase": "picking | reveal | game-over",
  "players": [
    { "playFabId": "string", "name": "string", "lives": 3, "hasPicked": false }
  ],
  "result": {
    "picks": { "<playFabId>": "rock | paper | scissors" },
    "losers": ["<playFabId>"],
    "isDraw": false
  },
  "winnerName": "string | null"
}
```

`hasPicked` is visible to all clients — what was picked is hidden until all alive players have submitted.

#### Morra actions (`POST /rooms/{roomId}/action`)

**pick**
```json
{ "sessionTicket": "string", "type": "pick", "hand": "rock | paper | scissors" }
```
Submit this player's hand for the round. Once all alive players have picked, the round resolves automatically and `gamePhase` transitions to `reveal`.

**next-round**
```json
{ "sessionTicket": "string", "type": "next-round" }
```
Any player advances past the reveal screen. Resets picks and starts the next round.

