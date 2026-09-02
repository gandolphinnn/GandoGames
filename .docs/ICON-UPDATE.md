# Icon Update Behaviour

When a user changes their icon on the `/profile` page, the update propagates in two stages: immediate local update, then lazy room propagation.

---

## Flow

### 1. Profile page → UserService

`profile.component.ts` calls `userService.updateProfileData({ icon })` (via `setIcon`).

`UserService.updateProfileData` **immediately** updates the local `user` signal, so the UI reflects the change instantly for the current user, then debounces (1 s) a single `POST /profile/update` carrying the changed fields. If the request fails it rolls the signal back to the pre-update snapshot and shows a warning. Icon/theme/language are server-side profile data restored on next login via `/auth/check` — they are not written to `localStorage` (only the session ticket is).

### 2. API — `/profile/update`

`profileUpdateInner` (`profile.ts`) writes the changed icon/theme/language to PlayFab user data (`UpdateUserData`). It returns the full `ProfileData` and does nothing else — **no room state is touched here**.

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

To push icon changes immediately, `profileUpdateInner` would need to load all active rooms containing the player and broadcast `roomUpsert` for each — this is intentionally avoided as a non-critical UX trade-off.
