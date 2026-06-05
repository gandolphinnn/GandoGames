### THIS FEATURE HAS BEEN DEVELOPED BUT THEN STASHED, THIS IS JUST A REPORT ON WHAT HAS BEEN DONE

# Online Player Counter

A live count of online players in the app header, with a hover tooltip listing their names.

## Design

**Presence tracking** — on every SignalR negotiate, the API upserts `{ name, ts }` into an in-memory `Map<userId, ...>` and broadcasts the current name array as `onlineCountUpdated` to all connected clients. A 24h TTL purges truly stale entries.

**Disconnect cleanup** — Azure SignalR Service upstream webhooks call `/api/signalr/events` when a client disconnects. The function validates the `X-ASRS-Signature` HMAC, removes the user from the map, and broadcasts the updated list.

**Timing fix** — the initial negotiate fires before the WebSocket is open, so the broadcast is missed. After `connection.start()` the client clears its negotiate cache and re-negotiates so the broadcast arrives while the connection is live. The same re-negotiate fires on `onreconnected` to restore presence after automatic reconnects.

## Azure portal config

In the SignalR Service resource → **Settings → Upstream**:

| Field | Value |
|---|---|
| URL Template | `https://api.gandogames.org/api/signalr/events` |
| Hub pattern | `gameHub` |
| Category pattern | `connections` |
| Event pattern | `disconnected` |

## Why it was shelved

The project uses a single Azure SignalR Service instance shared between local dev and production. This causes two problems:

1. **Upstream webhooks point at production** — local dev disconnects never reach the local Function, leaving stale entries in the presence map.
2. **Shared state** — local dev connections inflate the online count shown to real users.

## Resuming this feature

The prerequisite is a dedicated dev Azure environment (separate SignalR instance + Function App). Once that exists:

1. Set `AzureSignalRConnectionString` in `api/local.settings.json` to the dev SignalR instance.
2. Expose the local Function host via a tunnel (VS Code Dev Tunnels or ngrok).
3. Configure the upstream on the dev SignalR instance pointing at the tunnel URL.
4. Re-apply the stashed changes (`git stash pop`).

All the code is already written — it just needs the infrastructure to be separated first.
