---
name: new-game
description: Scaffold a complete new multiplayer game into the GandoGames project (frontend + backend + shared types). Invoke with the game name as the argument.
---

# New Game Scaffold

Scaffold a complete new multiplayer game called **$ARGUMENTS** into the GandoGames monorepo (frontend + backend + shared types).

---

## Step 1 — Read the architecture

Read every file listed below before asking the user anything or generating any code. These give you the conventions, patterns, and exact shapes to follow.

**Documentation:**
- `_docs/PLAY.md` — game component contract and full room lifecycle
- `_docs/STRUCTURE.md` — monorepo layout and data-flow pattern
- `_docs/API.md` — all API endpoints and shared types
- `CLAUDE.md` — coding conventions: CSS naming, component prefix `gg-`, mobile-first, visibility modifiers, no test files

**Reference implementation (morra — the canonical game):**
- `common/games/morra.ts` — shared state/player/action types
- `api/src/games/game.ts` — abstract `Game<TState>` class + `GAMES_CONFIG`
- `api/src/games/morra.ts` — complete `Game` implementation
- `api/src/games/index.ts` — `Game.Factory` wiring
- `site/lib/games/morra/src/morra.models.ts` — frontend models + constants
- `site/lib/games/morra/src/morra-game.component.ts` — game component pattern
- `site/lib/games/morra/src/morra-game.component.html` — template patterns (`@let`, `@switch`, SignalR-driven state)
- `site/lib/games/morra/src/morra-game.component.scss` — SCSS conventions
- `site/lib/games/morra/index.ts` — package export

**Files to modify (read before editing):**
- `common/src/game.ts` — `GameType` union
- `common/index.ts` — top-level re-exports
- `site/tsconfig.json` — path aliases
- `site/lib/game-registry.ts` — `GAME_REGISTRY` array
- `site/src/app/game-component-registry.ts` — `GAME_COMPONENT_REGISTRY` map

---

## Step 2 — Gather requirements

Ask the user these questions **before generating any files**. Do not guess or assume defaults.

1. **Min / max players** — How many players can join?
2. **Game phases** — What phases does the game cycle through? (e.g. `'turn-start' | 'result' | 'game-over'`)
3. **Player state** — What extra fields does each player have beyond `{ id, name }`?
4. **Actions** — What can a player do on their turn? What data does each action carry?
5. **Hidden information** — Is any state secret from other players?
6. **Win condition** — How does the game end? Who is the winner?
7. **Round result** — Is there a per-round result object to store and display? If so, what fields?

Wait for all answers before continuing.

---

## Step 3 — Generate files in this exact order

Use `<name>` for the lowercase game name and `<Name>` for PascalCase.

### 3.1 `common/games/<name>.ts`

Follow `common/games/morra.ts` as the template:
- `<Name>Player extends GamePlayer` — add game-specific player fields
- `<Name>GameState extends GameState` — must include `gamePhase`, `players: <Name>Player[]`, optional `winnerName?: string`, plus any round-result or turn-tracking fields
- `<Name>RoundResult` (if applicable)
- `<Name>RoomState extends RoomData`

### 3.2 `common/src/game.ts`

Add `| '<name>'` to the `GameType` union. Nothing else.

### 3.3 `api/src/games/<name>.ts`

Implement `<Name>Game extends Game<<Name>GameState>`:
- `public override minPlayers` / `maxPlayers`
- `initialize(players)` — build initial state; always set `gamePhase` and `lastUpdate: new Date()`
- `getPublicState(playerId)` — strip hidden fields from opponents if applicable
- `action(player, action, data)` — dispatch to private methods; update `state.lastUpdate = new Date()` in each; return `this.state!` for unknown actions

### 3.4 `api/src/games/game.ts`

Add `'<name>': { minPlayers: N, maxPlayers: M }` to `GAMES_CONFIG`.

### 3.5 `api/src/games/index.ts`

Add `case '<name>': return new <Name>Game();` to `Game.Factory` and `export * from './<name>';` at the bottom.

### 3.6 `site/tsconfig.json`

Add to `compilerOptions.paths`:
```json
"@gandogames/common/<name>": ["../common/games/<name>"]
```
The game component import is covered by the existing `@gandogames/lib/*` wildcard — do not add a redundant entry for it.

### 3.7 `site/lib/games/<name>/src/<name>.models.ts`

Re-export common types + frontend-only constants (display labels, etc.).

### 3.8 `site/lib/games/<name>/src/<name>-game.component.ts`

Standalone Angular component following `morra-game.component.ts` exactly:
- Selector: `gg-<name>-game`
- `@Input() roomId!: string`
- Inject: `SignalRService`, `BackendService`, `AuthService`, `Router`, `DestroyRef`
- `ngOnInit()`: `void this.loadState()` + subscribe to `signalR.events.gameStateUpdated` filtered by `roomId`, using `takeUntilDestroyed(this.destroyRef)`
- `loadState()`: POST `/game/state` with `{ sessionTicket, game: '<name>', roomId }`; catch silently
- Action methods: POST `/game/action` with `{ sessionTicket, game: '<name>', roomId, action, data }`
- `backToLobby()`: `this.router.navigate(['/play'])`
- Use `public` or `private` on every member; `protected` only for things the template binds to

### 3.9 `site/lib/games/<name>/src/<name>-game.component.html`

Required structure:
```html
@let gs = gameState();
@if (!gs) {
  <div class="game-loading"><p>Loading game…</p></div>
} @else {
  <div class="<name>-game">
    <header class="game-header">
      <button class="game-back" (click)="backToLobby()">← Back</button>
      <h1 class="game-title"><Display Name></h1>
    </header>
    <!-- players strip -->
    <main class="game-panel">
      @switch (gs.gamePhase) {
        @case ('...') { ... }
        @case ('game-over') {
          <div class="panel panel-centered">
            <h2>{{ gs.winnerName }}</h2>
            <button class="btn btn-primary" (click)="backToLobby()">Play Again</button>
          </div>
        }
      }
    </main>
  </div>
}
```

### 3.10 `site/lib/games/<name>/src/<name>-game.component.scss`

Mobile-first SCSS. Class names use hyphens only — no `__` or `--`. Root block: `.<name>-game { display: flex; flex-direction: column; height: 100%; }`.

### 3.11 `site/lib/games/<name>/index.ts`

```ts
export { <Name>GameComponent } from './src/<name>-game.component';
```

### 3.12 `site/lib/game-registry.ts`

Add a `GameDescriptor` entry to `GAME_REGISTRY` with `id`, `name`, `description`, `minPlayers`, `maxPlayers`.

### 3.13 `site/src/app/game-component-registry.ts`

Import `<Name>GameComponent` from `@gandogames/lib/games/<name>` and add `'<name>': <Name>GameComponent`.

---

## Step 4 — Verify

Run both checks and fix every error before reporting done:

```bash
cd api && npm run build
cd ../site && npx tsc --noEmit
```

Do not declare the scaffold complete until both commands exit cleanly.
