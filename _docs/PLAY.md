# Play

## `/play`
Lists rooms for all games. Shows a filter to toggle per-game visibility.  
Rooms update in real-time via SignalR (`roomUpsert`, `roomDeleted` events).  
Initial load fetches all rooms via `POST /rooms/list`.

## `/play/:roomId`
Shows the detail for a specific room.

- Loads room via `POST /rooms/get` on init.
- Updates reactively via `roomUpsert` / `roomDeleted` SignalR events.
- **Join** — visible if room is `waiting`, user is not already in it, and player count < max.
- **Start** — visible to host only if room is `waiting` and player count ≥ min.
- **Leave** — navigates back to `/play` and notifies the API.
- On any navigation away or tab close, calls `leaveRoom` (beacon fetch with `keepalive: true` on unload).
