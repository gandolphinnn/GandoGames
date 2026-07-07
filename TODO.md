- Redo the UI for the room lobby and game
	Display a table and sit players around with the active player in a fixed place (TBD where).
	The table might change depending on the game, so create some presets or use a default and allow games to use overrides. 
- Redo the behaviour when a user leave a room and when a game is over
	Display who won and for what reason (game based win or forfeit)
	BUG: If a player leaves and just one player remain, that player win the game and remove the room from its list but the room stays open for everyone else to see.
- Save/import game settings presets:
	Let a player save a favourite combination of game settings and import them into a room in one click.
	(The per-room Game settings editor — game/settings/get & set, schema-driven modal, pankov & poker settings — is already implemented; this presets feature was deferred.)
- Improved login page:
	login with other means (google, facebook, apple...)
	alert guest login that many functionalities are not available and that the profile could be deleted
- Push notifications
- Game statistics
- AI bot mutation logic: higly tested code, with random number generation based on an initial seed.
- Room list filters
	By games (dropdown combo)
	By friends only (DEPENDS ON FRIENDS FEATURE)
	By players range
	By flags (like "canAddBot", "canPlayLocally", ecc...) (these flags are just ideas)
- Online player counter based on last request done
	Just an idea: i need to verify if its really the best approach.
- Guest login with custom displayName
	Still need to decide if i want to implement this
- Profile page enhancement
	Ability to change display name
	Ability to change password
	Ability to convert a guest user to a logged one
- Queue system if 20 signalR connection are already occupied
	really low priority