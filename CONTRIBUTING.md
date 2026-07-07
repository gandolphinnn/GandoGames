# Contributing to GandoGames

Thanks for your interest in contributing! GandoGames is a hobby multiplayer party-game web app (Angular + Ionic frontend, Azure Functions API, PlayFab + Azure SignalR). This guide covers **what** to work on, **how** to do it technically, and the **standards** your changes should meet.

> For deeper detail, see [`README.md`](README.md) (setup), [`ARCHITECTURE.md`](ARCHITECTURE.md) (the big picture), [`_docs/`](_docs) (subsystem docs), and [`CLAUDE.md`](CLAUDE.md) (the authoritative coding conventions, also used by AI assistants).

---

## What to contribute

Welcome contributions include:

- **Bug fixes** — check the issues list first; comment on one to claim it.
- **New games** — each game is a self-contained package; see [How to add a game](#adding-a-new-game).
- **UI / UX improvements** — mobile-first, using Ionic components.
- **Tests** — more coverage is always welcome (unit and E2E).
- **Docs** — keep `_docs/`, `README.md`, and this file accurate.

**Before starting non-trivial work**, open an issue to discuss it. In particular:

- **Large changes / refactors** — agree on the approach first.
- **New dependencies** — do **not** add an npm package without maintainer sign-off; propose it in the issue/PR and wait for approval.
- **Secrets** — this is a public repo. Never commit secrets, tokens, or connection strings (see [Security](#security)).

---

## Getting set up

**Prerequisites**

- **Node.js 22.x** (CI runs on Node 22) and npm
- **Azure Functions Core Tools v4** (`func`) — to run the API
- **.NET SDK** + the **Azure SignalR Emulator** (`dotnet tool install -g Microsoft.Azure.SignalR.Emulator`) — **required** for the mock (no-secrets) setup. GandoGames is real-time at its core (live rooms, game state, chat, invites all arrive over SignalR — the client never polls), and without secrets the emulator is the only way to get a working SignalR endpoint locally. *Only maintainers with real PlayFab + Azure SignalR credentials can point at the real services and skip it.*

**Fork & clone**

External contributors should **fork** the repo, then clone their fork. Install dependencies per package:

```bash
cd site && npm install
cd ../api && npm install
```

**Run it locally — no secrets needed.** The API can run against an in-memory PlayFab simulation, so you don't need any credentials:

```bash
cp api/local.settings.sample.json api/local.settings.json   # sets MOCK_BACKEND=true
asrs-emulator start                                          # required — serves the local SignalR hub
cd api  && npm start                                         # → http://localhost:7071
cd site && ng serve                                          # → http://localhost:1212
```

See [README → Run the backend without secrets](README.md#run-the-backend-without-secrets-mock-mode) for the full walkthrough (including how to use real PlayFab credentials instead).

---

## How to contribute (the technical flow)

1. **Branch from `develop`.** `develop` is the integration branch; `master` is production. Use a short, descriptive branch name, e.g. `feature/poker-side-pots` or `fix/room-list-filter`.
2. **Make focused changes.** Keep a PR scoped to one logical change. Put any HTTP/SignalR contract types in `shared/` so the site and API share one source of truth.
3. **Verify locally** — run the same checks CI runs (and a bit more), and fix everything before pushing:

   ```bash
   # API (from api/)
   npm run build        # tsc — must compile clean
   npm test             # Jest (game logic, utilities, mock backend)

   # Site (from site/)
   npm test             # Karma/Jasmine (services)
   npm run build        # production build must succeed
   npm run test:e2e     # Playwright E2E (first run: npx playwright install chromium)
   ng lint              # if configured
   ```

4. **Commit** with clear, imperative messages (e.g. `Add side-pot handling to poker`). Keep commits coherent; reference an issue number when relevant (`Fix #42: …`).
5. **Open a Pull Request targeting `develop`.** Describe **what** changed and **why**, and link the issue. Keep the diff focused.
6. **CI runs automatically.** A PR to `develop` builds + unit-tests **both** packages as a gate, then deploys a disposable **preview environment** and comments the preview Site + API URLs on the PR. The preview is torn down when the PR closes. **Your PR must be green to merge.**
7. **Review & approval.** Every change requires approval from the code owner (**@gandolphinnn**, per [`.github/CODEOWNERS`](.github/CODEOWNERS)). Address review feedback by pushing follow-up commits.
8. **Merge.** A maintainer merges to `develop`. Promotion to production (`master`) and `staging` is handled by maintainers — pushing to `master` auto-deploys the site and API to Azure.

---

## Coding standards (how you should do it)

These are enforced by review; `CLAUDE.md` is the authoritative reference.

**TypeScript**

- Put an **explicit access modifier on every class member** — `public` or `private`. Reserve `protected` for members an Angular template binds to (or genuine inheritance).
- Avoid `any`; if you must bridge a third-party boundary, cast narrowly and locally.
- Shared HTTP/SignalR contracts live in **`shared/`** and contain **types and interfaces only** (they're erased at build time). Import them via `@gandogames/shared/dto`.

**Angular (site)**

- **Standalone components** (no NgModules). Component selector prefix is **`gg-`**.
- Prefer **signal APIs** — `input()`, `output()`, `viewChild()`, `computed()`, `signal()` — over the `@Input()`/`@Output()`/`@ViewChild()` decorators.
- Build UI with **Ionic standalone components** (imported per-component from `@ionic/angular/standalone`); routed pages set `host: { class: 'ion-page' }`.
- **`BackendService` call pattern:** always declare a typed request variable and pass the response type generic — never an inline object literal:

  ```ts
  const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
  const result = await this.backend.post<RoomData>('/rooms/get', request);
  ```

**Styles**

- **SCSS**, mobile-first. Scale up with `@media (min-width: $bp-sm)`. Touch targets ≥ 44×44 px.
- **Class names use single hyphens only** — no `__` or `--` (e.g. `.btn-primary`, `.panel-title`).

**API (Azure Functions)**

- Register endpoints with the wrappers in `api/src/index.ts` (`registerPublicFunction` / `registerFunction`); broadcast SignalR events via the `InnerFunctionNotifier` methods. See [`_docs/STRUCTURE.md`](_docs/STRUCTURE.md).

**Games**

<a id="adding-a-new-game"></a>

- Each game is a self-contained package in `site/lib/games/<name>/` that exports a component implementing the `GameComponent` interface, registered in `site/lib/game-registry.ts`; server logic goes in `api/src/games/` behind `Game.Factory`. See [`_docs/PLAY.md`](_docs/PLAY.md).
- **Reuse shared widgets.** If a game component (dice, cards, chips, …) could serve other games, build it in **`site/lib/common/`** rather than inline — and check whether one already exists there.

**Tests**

- Add or update tests with your change: **Jest** for the API (`api/src/**/*.spec.ts`), **Karma/Jasmine** for site services (`site/src/app/**/*.spec.ts`), and **Playwright** for E2E (`site/e2e/*.spec.ts`, fully route-mocked — no live backend).

---

## Security

- **Never commit secrets.** `PLAYFAB_SECRET_KEY`, `PLAYFAB_TITLE_ID`, and `AzureSignalRConnectionString` belong in `api/local.settings.json` (gitignored) locally and in Azure / GitHub settings in production. Use `MOCK_BACKEND=true` for secret-free local development.
- If you find a security issue, please report it privately to the maintainer rather than opening a public issue.

---

## Questions

Open an issue or a discussion. Thanks for contributing! 🎲
