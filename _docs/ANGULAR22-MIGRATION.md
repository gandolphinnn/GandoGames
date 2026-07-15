# Angular 22 + TypeScript 6 Migration

**Status: attempted and fully reverted on 2026-07-15.** The upgrade itself worked — it was rolled back only because it ran concurrently with the Endpoint-contract refactor of `shared/` + `api/`, and mixing the two uncommitted changesets made the tree unreviewable. This document is the playbook for redoing it cleanly.

---

## Version facts (checked 2026-07-15)

| What | Version | Notes |
|---|---|---|
| Angular latest | 22.0.6 | requires TypeScript `>=6.0 <6.1` and Node `^22.22.3 \|\| ^24.15.0 \|\| >=26` |
| TypeScript via Angular 22 | 6.0.3 | `ng update` bumps it automatically |
| TypeScript latest | 7.0.2 | the Go-native compiler — **unusable**: Angular caps at `<6.1`, ts-jest at `<7` |
| Max TypeScript on Angular 20 | 5.9.3 | Angular 20 peer range is `>=5.8 <6.0` |

Peer compatibility with Angular 22 — already verified, **no bumps needed**: `@ionic/angular` 8 (`@angular/core >=16`), `@ngx-translate/core` 18 (`>=18`), `zone.js ~0.15.0`, `rxjs ~7.8.0`.

---

## Prerequisites

1. **Clean `git status`, no parallel sessions.** This is what killed the first attempt.
2. **Node.** The Angular 22 CLI hard-errors below `22.22.3` / `24.15.0`. With nvm-windows: `nvm use 24.18.0` (already installed), or a per-command PATH prefix that leaves the global symlink alone:
   ```powershell
   $env:Path = 'C:\Node\nvm\v24.18.0;' + $env:Path
   ```
   `func start` (api) still requires Node 22.x — a single Node ≥22.22.3 <23 would satisfy both, but none is installed yet.
3. Set `$env:CI = 'true'` before `ng update` so optional migrations never prompt interactively.

---

## Steps

One major at a time, verifying between steps (from `site/`):

```powershell
npx ng update @angular/core@21 @angular/cli@21   # zero-change migrations on this codebase
npx ng build; npm test                            # was verified green: build clean, 64/64 Karma
npx ng update @angular/core@22 @angular/cli@22   # also bumps typescript to 6.0.x
npx ng build; npm test; npm run test:e2e
```

Then the api (from `api/`): set `"typescript": "~6.0.3"` in `package.json` — ts-jest ≥29.4.7 is required for TS 6 and 29.4.9 is already installed; `api/tsconfig.json` is already `module`/`moduleResolution: node16`, which is TS-6-ready — and run `npm install; npm run build; npm test`.

Finally update `CLAUDE.md`: the two "Angular 20" mentions and a note about the Node requirement.

---

## What the v22 `ng update` changes (all correct, expect them)

- **`changeDetection: ChangeDetectionStrategy.Eager`** added to every component that doesn't declare a strategy (all 27 of them). Angular 22 flips the default to `OnPush`; `Eager` preserves pre-22 behavior. Follow-up worth doing later: this app is signals-based, so moving components to `OnPush` and dropping the `Eager` lines is a sensible modernization.
- **`provideHttpClient(withXhr())`** in `app.config.ts` and `backend.service.spec.ts` — v22 changes the default HTTP backend; `withXhr()` keeps the current one.
- **`$safeNavigationMigration(...)`** wrappers around some `?.` expressions inside translate-pipe parameters (3 templates: pankov, poker, room-lobby). It is a real `@angular/compiler` builtin that preserves the old safe-navigation semantics.
- **Extended diagnostics suppressed** (`nullishCoalescingNotNullable`, `optionalChainNotNullable`) in `tsconfig.app.json` + `tsconfig.spec.json`.
- **`istanbul-lib-instrument`** added to devDependencies (Karma coverage under v22).

---

## Gotchas

- The v22 router defaults `paramsInheritanceStrategy` to `'always'` (was `'emptyOnly'`). If `url.service.spec.ts` goes red, pin `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })` in `provideRouter` or adapt `UrlService`.
- The **Karma builder is deprecated** in v22. The optional `migrate-karma-to-vitest` migration exists (`ng update @angular/cli --name migrate-karma-to-vitest`) but the specs are Jasmine — evaluate that move separately, don't run it as part of this migration.
- `ng update` rewrites `site/package.json` with 2-space indentation (the repo uses tabs) and leaves space-indented blocks in the tsconfigs — cosmetic, re-tab if it bothers you.
- In-template compile errors are stricter in v22 (duplicate bindings throw, multiple matching selectors throw, `in` in expressions throws) — none of these fired on this codebase.
