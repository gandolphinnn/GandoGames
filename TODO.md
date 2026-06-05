- Redo the behaviour when a user leave a room and when a game is over
	Display who won and for what reason (game based win or forfeit)
	BUG: If a player leaves and just one player remain, that player win the game and remove the room from its list but the room stays open for everyone else to see.
- Game settings editor:
	In the room details, add the ability to open a game-specific modal, defined in "site\lib\games\$game_name\src\$to_be_defined_later"
	This modal will contain every field to change the settings of the game for this room
	"api/game/settings/get" and "api/game/settings/set" to access and edit
	Example for poker: "player pot" amount, "minimum bet" amount, "smaller deck" flag, "display win percentage" flag.
	Find some kind of method to save/import settings configuration, so a player that ofter plays a game with some particular combination of settings can import those in a click
- Room access policies:
	Slider with: "invite only", "link only", "friends only", "join with code", "public access".
	Change room visibility in the room list based on the slider:
		- invite only -> completely invisible
		- link only -> completely invisible
		- friends only -> visible just to friends (maybe add a section in the room list called "friends rooms")
		- join with code -> publicly visible, details hidden behind a host-picked access code
		- public access -> publicly visible, details visible, free join
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