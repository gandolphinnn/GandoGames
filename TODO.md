- Friends requests using playfab friends system
- Online player counter based on last request done
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
- Guest login with custom displayName
	Still need to decide if i want to implement this
- Profile page enhancement
	Ability to change display name
	Ability to change password
	Ability to convert a guest user to a logged one
- Queue system if 20 signalR connection are already occupied
	really low priority