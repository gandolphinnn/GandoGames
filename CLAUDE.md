# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
ng serve          # dev server on :1212
ng build          # production build → dist/
ng lint           # lint (if configured)
```

No test runner is configured — do not generate spec files or add test dependencies.

## Architecture

Angular 20 standalone app (no NgModules). Entry point: `src/main.ts` bootstraps `App` from `src/app/app.component.ts`.

**Component prefix:** `gg-` (e.g. `gg-app`, `gg-login`). The root element in `src/index.html` must match the root component's selector.

**Styles:** SCSS (`.scss` syntax). `stylePreprocessorOptions.includePaths: ["src"]` is set, so any component can `@use 'styles/variables' as *` without a relative path.

**CSS naming:** Use hyphens only — no underscores. Single hyphens throughout: `.block`, `.block-element`, `.block-modifier`. Never use `__` or `--` (e.g. `.btn-primary` not `.btn--primary`, `.panel-title` not `.panel__title`).

**Responsiveness:** All components must be mobile-first. Use `@media (min-width: $bp-sm)` (defined in `src/styles/_variables.scss`) to scale up for larger screens. Touch targets must be at least 44×44 px.

### Game packages

Games live in `games/<name>/` at the project root, each with an `index.ts` as its public API. They are imported into the Angular app via TypeScript path aliases defined in `tsconfig.json`:

```
@gandogames/pankov  →  games/pankov/index.ts
@gandogames/trio    →  games/trio/index.ts
```

Each game package should export an Angular `Routes` array (e.g. `PANKOV_ROUTES`) that the main app lazy-loads. Game logic lives entirely in the game package — the Angular app only hosts and routes to it.

To add a new game: create `games/<name>/index.ts`, add a path alias to `tsconfig.json`, and register it in the game registry (to be created at `src/app/game-registry.ts`).

### Backend (planned)

- `api/` — Azure Functions v4 (TypeScript). Acts as a secure proxy to Azure PlayFab; never exposes `PLAYFAB_SECRET_KEY` to the client.
- No database — PlayFab handles auth, rooms (Lobbies API), statistics, and game history (PlayStream events).
- In production, Azure Static Web Apps routes `/api/*` to the Functions app.
