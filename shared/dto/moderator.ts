import { GameState, RoomData } from ".";

export interface ModeratorRoomsListResponse {
	rooms: RoomData[],
	games: GameState[]
}