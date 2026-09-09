- Admin tabs
	Rooms: list all active rooms and apply actions on them
	Labels: CRUD on all labels in multiple languages
	Games: CMS for names and descriptions, visibility ecc... (only on existing games, this feature is not for creating or changing games and their behaviour)
	Users: list all active users, change roles, ban. (TODO: see if its actually feasible, otherwise just use the playfab page) 
- Og meta tags
- API middleware to apply DRY on api methods for checks early returns
- Improved login page:
	login with other means (google, facebook, apple...)
	alert guest login that many functionalities are not available and that the profile could be deleted
- Push notifications
- Game statistics
- Save/import game settings presets:
	Let a player save a favourite combination of game settings and import them into a room in one click.
	(The per-room Game settings editor — game/settings/get & set, schema-driven modal, pankov & poker settings — is already implemented; this presets feature was deferred.)
- Room list filters
	By games (dropdown combo)
	By players range
	By flags (like "canAddBot", "canPlayLocally", ecc...) (these flags are just ideas)
- Online player counter based on last request done
	Just an idea: i need to verify if its really the best approach.
- Guest login with custom displayName
	Still need to decide if i want to implement this
- Profile page enhancement
	Export user info (GDPR)
	Ability to change display name
	Ability to change password
	Ability to convert a guest user to a logged one
- Queue system if 20 signalR connection are already occupied
	really low priority