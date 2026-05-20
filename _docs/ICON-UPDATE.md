# Icon Update Behaviour

When a user changes their icon on the `/profile` page, the update propagates in two stages: immediate local update, then lazy room propagation.

---

## Flow

### 1. Profile page → AuthService

`profile.component.ts` calls `auth.updateIcon(iconId)`.

`AuthService.updateIcon` POSTs to `/auth/updateIcon` and, on success, **immediately** updates the local `user` signal and persists the new icon to `localStorage`. The UI reflects the change instantly for the current user.

### 2. API — `/auth/updateIcon`

`updateIconInner` writes the new icon to PlayFab user data (`UpdateUserData`). It returns `{ icon }` and does nothing else — **no room state is touched here**.

### 3. Room propagation — lazy, pull-based

Rooms are not notified of icon changes proactively. Instead, `roomGetInner` (`room.ts`) performs a reconciliation check each time any player calls `POST /rooms/get`:

```
if (room.players[idx].icon !== player.icon)
    → update room player record
    → upsert room to storage
    → broadcast roomUpsert to all clients in the room
```

Other players in the room receive the updated icon only after this reconciliation runs, which happens when the user next visits or refreshes the room page.

---

## Implication

If a user changes their icon while already inside a room and never navigates away, their old icon remains visible to other players until `/rooms/get` is called again.

To push icon changes immediately, `updateIconInner` would need to load all active rooms containing the player and broadcast `roomUpsert` for each — this is intentionally avoided as a non-critical UX trade-off.
