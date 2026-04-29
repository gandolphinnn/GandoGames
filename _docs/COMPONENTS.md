# Components

## Pages

| Component | Route | Notes |
|---|---|---|
| `AboutComponent` | `/about` | Public |
| `LoginComponent` | `/login` | Redirects if logged in |
| `SignupComponent` | `/signup` | Redirects if logged in |
| `HomeComponent` | `/` | Shell for authenticated area |
| `ProfileComponent` | `/profile` | |
| `PlayComponent` | `/play` | Shell for play area |
| `RoomsComponent` | `/play` (index) | Room list with SignalR updates |
| `RoomDetailComponent` | `/play/:roomId` | Join/start/leave; leaves room on unload |
