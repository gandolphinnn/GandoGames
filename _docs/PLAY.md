# PLAY

### play
Show rooms for ALL games. Include a filter to toggle each game rooms.

### play:game_id`
Show rooms for that game only. Exactly the same as above, but with only that game toggled on.

### play:game_id/:room_id`
Check if a room with that id exists for that game.
If so, display its info and if it's possible to join that room.
A room is joinable if it hasn't reached the max player count.
If so, enable a button "JOIN", otherwise disabled.