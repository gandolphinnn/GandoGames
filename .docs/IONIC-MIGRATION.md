# Ionic Migration

## Why Ionic

GandoGames is a multiplayer party game platform. Players are most likely to use it on their phones at the same table — not at a desktop. A responsive "desktop site that shrinks" still feels like a website, with small tap targets and no native UI patterns.

Ionic provides components that behave like a native mobile app — touch-friendly lists, modals/bottom sheets, pull-to-refresh, a hardware-aware back button, and 44 × 44 px touch targets by default — which would otherwise have to be built from scratch in CSS/HTML.

---

## Approach: wholesale adoption, single component tree

The app uses Ionic **everywhere**, with a single component tree — there is **no** desktop/mobile split and **no** device-detection service. Each component imports only the standalone Ionic pieces its template needs:

```typescript
import { IonHeader, IonToolbar, IonContent, IonButton } from '@ionic/angular/standalone';
```

Routed page components carry the `ion-page` class **unconditionally** so Ionic transitions and layout work inside `ion-router-outlet`:

```typescript
host: { class: 'ion-page' }
```

Icons come from two sources: `ionicons` (registered per-component with `addIcons({ … })` and rendered via `ion-icon`), and a few Font Awesome classes used in game metadata (`GAME_REGISTRY` icons such as `fa-solid fa-dice`).

---

## Navigation: side menu (not tabs)

The root shell (`App`, `gg-app`) is built from `IonApp` + `IonMenu` + `IonRouterOutlet`:

- An overlay **side menu** (`<ion-menu menuId="main-menu" contentId="main-content">`) holds top-level navigation (play, profile, social, the caller's live rooms). It is disabled until the user is logged in.
- `<ion-router-outlet id="main-content">` renders the routed pages.
- Menu items use `ion-menu-toggle` so the drawer closes on navigation; `MenuController` closes it programmatically (e.g. when jumping to a room).

---

## PWA

The web manifest (`site/public/manifest.webmanifest`) is configured with `"display": "standalone"`, so when installed on Android or iOS the app launches full-screen without browser chrome. The theme and background colours match the dark walnut palette.

---

## Notes

- **Games** (Pankov, Poker) take the full viewport when active and render inside `RoomPlayComponent`; they use Ionic chrome only for their own controls.
- **Capacitor** is not used — the app is web-only. Capacitor would be needed only for native device APIs (camera, push notifications, etc.).
