# Routes

### Public
- `/about` — project info

### Auth (redirect to `/play` if already logged in)
- `/login`
- `/signup`

### Authenticated (redirect to `/login` if not logged in)
- `/` → redirects to `/play`
- `/profile`
- `/play` — room list for all games
- `/play/:roomId` — room detail (join / start / leave)
