# Components

All components are standalone, use the `gg-` selector prefix, and are built with Ionic standalone components. See `ROUTES.md` for the route tree.

## Pages (routed)

| Component | Route | Notes |
|---|---|---|
| `AboutComponent` | `/about` | Public |
| `PaletteComponent` | `/test/palette` | Public — design-system palette preview |
| `LoginComponent` | `/login` | Redirects to `/` if logged in |
| `SignupComponent` | `/signup` | Redirects to `/` if logged in |
| `HomeComponent` | `/` | Authenticated shell (`ion-router-outlet`); routes redirect to `/play` |
| `ProfileComponent` | `/profile` | Icon / theme / language, logout, delete account |
| `SocialComponent` | `/social` | Friends list and pending requests |
| `RoomListComponent` | `/play` | Room list with per-game filter; real-time via SignalR |
| `RoomNewComponent` | `/play/new` | Create a room |
| `RoomDetailComponent` | `/play/:roomId` | Lobby while `waiting`; hosts the game while `playing` |

## Shared components (`site/src/app/components/`)

| Component | Selector | Notes |
|---|---|---|
| `App` | `gg-app` | Root shell: `ion-menu` side navigation + `ion-router-outlet` |
| `ChatComponent` | `gg-chat` | In-room chat (SignalR `chatMessage`) |
| `PlayerAvatarComponent` | `gg-player-avatar` | Renders a player's icon + colour |
| `RefreshableContentComponent` | `gg-refreshable-content` | Pull-to-refresh wrapper (`ion-refresher`) |
| `ToastComponent` | `gg-toast` | App-wide toasts / confirm prompts |
| `InviteModalComponent` | `gg-invite-modal` | Invite an online player to a room (`pages/home/room/`) |
| `RoomPlayComponent` | `gg-room-play` | Game host; dynamically mounts the game component (`pages/home/room/play/`) |

## Reusable game widgets (`site/lib/common/`)

Shared, game-agnostic UI used across game packages (see the component-reuse rule in `CLAUDE.md`):

| Component | Selector | Notes |
|---|---|---|
| `DiceComponent` | `gg-dice` | Renders dice pips for a value |
| `FrenchCardComponent` | `gg-french-card` | A standard playing card |
| `PlayerChipComponent` | `gg-player-chip` | A poker chip / betting fiche |

## Game components (`site/lib/games/`)

Each game package exports one component implementing the `GameComponent` interface (`site/lib/game-registry.ts`):

| Component | Game |
|---|---|
| `PankovGameComponent` | `pankov` |
| `PokerGameComponent` | `poker` |
