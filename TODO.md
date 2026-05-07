- Room details graphic enhancement, with the ability to add a bot to a game
- AI bot mutation logic: higly tested code, with random number generation based on an initial seed.
- Game rules customization in the room lobby or in the room creation (tbd)
- Statistics
- Chat
	A slide-in panel docked to the right side of the screen (on mobile: a toggle button opens a full-width drawer).
	Channels:
	  - Global: everyone on the site
	  - Lobby (room): everyone in the same room — auto-joined when entering a room, left when leaving
	  - (future) Friends DM
	Transport: SignalR — add a `chatMessage` event type to SignalREventType.
	Storage: keep only the last N messages in Redis (LPUSH + LTRIM), fetched on join via a new `chat/history` endpoint.
	API: `chat/send` (authenticated) — validates message length, stores in Redis, broadcasts via SignalR to the target channel (group or global).
	UI: fixed panel with a channel tab bar, message list, and input box at the bottom.
- Push notifications
- Friends
- TimeTrigger function that automatically delets inactive guest users every month
- Queue system if 20 signalR connection are already occupied
- Online player counter