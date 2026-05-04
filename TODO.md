- Improved room participation handling, better auto-leave
- Game rules customization in the room lobby or in the room creation (tbd)
- Game state history
	On the right sight of the screen (on mobile is a togglable modal), show a list of every game state changes available to the user
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