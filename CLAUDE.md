# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

```
GandoGames/
├── common/api.ts          # Shared HTTP contract types (imported by both site/ and api/)
├── site/                  # Angular 20 SPA (Azure Static Web Apps)
│   ├── src/               # App source
│   ├── lib/games/         # Self-contained game packages (pankov, trio)
│   └── public/            # Static assets (staticwebapp.config.json)
└── api/                   # Azure Functions v4 (TypeScript)
    └── src/
        ├── index.ts       # Barrel: registerAzureHttpFunction, pfPromise, PlayFabClient, PlayFabServer
        └── functions/     # One file per concern (auth, rooms, game, stats, health)
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
```

No test runner is configured — do not generate spec files or add test dependencies.

## Site (Angular)

Angular 20 standalone app (no NgModules). Entry point: `src/main.ts` bootstraps `App` from `src/app/app.component.ts`.

**Component prefix:** `gg-` (e.g. `gg-app`, `gg-login`). The root element in `src/index.html` must match the root component's selector.

**Styles:** SCSS (`.scss` syntax). `stylePreprocessorOptions.includePaths: ["src"]` is set, so any component can `@use 'styles/variables' as *` without a relative path.

**CSS naming:** Use hyphens only — no underscores. Single hyphens throughout: `.block`, `.block-element`, `.block-modifier`. Never use `__` or `--` (e.g. `.btn-primary` not `.btn--primary`, `.panel-title` not `.panel__title`).

**Responsiveness:** All components must be mobile-first. Use `@media (min-width: $bp-sm)` (defined in `src/styles/_variables.scss`) to scale up for larger screens. Touch targets must be at least 44×44 px.

### Game packages

Games live in `site/lib/games/<name>/`, each with an `index.ts` as its public API. They are imported into the Angular app via TypeScript path aliases defined in `site/tsconfig.json`:

```
@gandogames/pankov  →  ./lib/games/pankov/index.ts
@gandogames/trio    →  ./lib/games/trio/index.ts
```

Each game package should export an Angular `Routes` array (e.g. `PANKOV_ROUTES`) that the main app lazy-loads. Game logic lives entirely in the game package — the Angular app only hosts and routes to it.

To add a new game: create `site/lib/games/<name>/index.ts`, add a path alias to `site/tsconfig.json`, and register it in the game registry (`src/app/game-registry.ts`).

## API (Azure Functions)

`api/` is an Azure Functions v4 TypeScript app. It acts as a secure proxy to Azure PlayFab — the `PLAYFAB_SECRET_KEY` never reaches the client.

**Barrel (`api/src/index.ts`):** All shared utilities are exported from here. Function files import from `'..'`.

- `registerAzureHttpFunction(name, method, route, innerFn)` — wraps `app.http()` with `authLevel: 'anonymous'` and a try/catch that maps success/error to `HttpResponseInit`.
- `InnerFunction<TReq, TRes>` — `async (body, params, options) => TRes`. Set `options.errorCode`, `options.successCode`, `options.errorMessage` before throwing to control the HTTP response.
- `pfPromise<T>(call)` — wraps a PlayFab SDK callback call into a Promise.
- `PlayFabClient`, `PlayFabServer` — re-exported from `playfab-sdk` after settings are initialised.

**Shared types:** `common/api.ts` (at the repo root, imported as `@gandogames/common/api`) is the single source of truth for all HTTP request/response shapes shared between `api/` and `site/`.

**Data storage:** No database. PlayFab SharedGroups store room state:
- `PANKOV_ROOMS` — index of open rooms (array of `RoomSummary`)
- `{roomCode}` — full `StoredRoomState` JSON for each room

**Secrets:** `PLAYFAB_TITLE_ID` and `PLAYFAB_SECRET_KEY` go in `api/local.settings.json` locally (gitignored) and in Azure Function App settings in production. Never commit secrets.
