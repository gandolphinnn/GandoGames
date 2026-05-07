- Room participation rework:
	a user will be able to join and start multiple rooms
	redo the room chip to be a dropdown button with all the rooms you are in
	add a "leave room" button next to the "back" button
	if you leave a room with a playing game you will forfeit the game
	if the last player leave the room the room will be closed and deleted
- Room details graphic enhancement, with the ability to add a bot to a game
- AI bot mutation logic: higly tested code, with random number generation based on an initial seed.
- Game rules customization in the room lobby or in the room creation (tbd)
- Statistics
- Chat
	A slide-in panel docked to the bottom-left side of the screen (on mobile: a toggle button opens a full-width drawer).
	Channels:
	  - Lobby (room): everyone in the same room — auto-joined when entering a room, left when leaving
	Transport: SignalR — add a `chatMessage` event type to SignalREventType.
	Storage: saved in the room data.
	API: `chat/send` (authenticated).
	UI: fixed panel with a channel tab bar, message list, and input box at the bottom.
- Push notifications
- Friends
- TimeTrigger function that automatically delets inactive guest users every month
- Queue system if 20 signalR connection are already occupied
- Online player counter