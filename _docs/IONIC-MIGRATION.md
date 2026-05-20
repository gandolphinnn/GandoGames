# Ionic Migration

## Why Ionic

GandoGames is a multiplayer party game platform. Players are most likely to use it on their phones at the same table — not at a desktop. A responsive "desktop site that shrinks" is not enough: it still feels like a website, with small tap targets, scroll-based navigation, and no native UI patterns.

Ionic provides a set of components that behave like a native mobile app:
- **Tab bar** (`ion-tabs`) — bottom navigation, the standard mobile pattern for top-level sections
- **Bottom sheets** (`ion-modal` with `breakpoints`) — contextual panels that slide up from the bottom instead of fixed side panels or drawers
- **Pull-to-refresh** (`ion-refresher`) — standard gesture for refreshing a list
- **Back button** (`ion-back-button`) — hardware-aware, history-integrated navigation
- **List / item** (`ion-list`, `ion-item`) — touch-friendly, swipe-ready list rows
- **Touch targets** — all interactive elements meet the 44 × 44 px minimum by default

All of these are things that would have to be built from scratch with plain CSS/HTML, and most would still not feel as polished.

---

## Approach: hard split, not progressive enhancement

Rather than adding responsive overrides on top of the desktop design, this project keeps **two separate component trees**:

```
device.isMobile()
  true  → Ionic components (ion-tabs, ion-modal, ion-list, …)
  false → original Angular design (unchanged from master)
```

This is enforced at every level: `AppComponent`, `HomeComponent`, and every routed page (`RoomListComponent`, `RoomDetailComponent`, `ProfileComponent`, `SocialComponent`), plus the shared widgets (`ChatComponent`, `GameHistoryComponent`).

The alternative — one template with `@media` overrides — produces a degraded experience on both platforms: the desktop design gets extra Ionic CSS loaded into it, and the mobile design is constrained by desktop layout assumptions.

The cost of the split is **template duplication** per component. This is accepted because:
1. The two UX patterns are genuinely different (tab bar vs navbar, bottom sheet vs side panel, etc.)
2. The logic layer (TypeScript class) is shared — only the template and host binding differ
3. Adding a new feature means writing it twice, but each version can be optimised for its platform

---

## DeviceService

```typescript
// user-agent check, evaluated once at service instantiation
public readonly isMobile = signal(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
```

Detection is user-agent based, not viewport-based. This means:
- The result is stable for the lifetime of the session (no signal reactivity needed)
- Desktop browsers with narrow viewports do not trigger mobile layout
- Ionic's `Platform.is('mobile')` was **not** used — it returned `true` on desktop in some configurations

The signal is consumed as `device.isMobile()` in templates and as `this.device.isMobile()` in class methods (e.g. `ProfileComponent.requestDelete()` to decide between `AlertController` and a plain `confirmingDelete` signal).

---

## Ion-page class

Ionic's CSS requires routed page components to carry the `ion-page` class for transitions and layout to work inside `ion-router-outlet`. This must **not** apply on desktop (it would claim the full viewport and cover the navbar).

All routed child components use a conditional host binding:

```typescript
host: { '[class.ion-page]': 'device.isMobile()' }
```

This is the critical difference from an unconditional `host: { class: 'ion-page' }` — the latter was the root cause of the navbar being hidden on desktop.

---

## PWA

The web manifest (`public/manifest.webmanifest`) is configured with `"display": "standalone"`, so when installed on Android or iOS the app launches full-screen without browser chrome. Ionic's components are designed for exactly this context. The theme colour and background colour are set to match the dark walnut palette.

---

## What is not migrated

- **Login / signup / about pages** — rarely visited, no navigation affordances needed, desktop design works fine as-is
- **Game components** (Morra, Pankov) — they already take the full viewport when active; no structural Ionic wrapping is needed
- **Capacitor** — not used. The app is web-only. Capacitor would be needed only if native device APIs (camera, push notifications, etc.) were required
