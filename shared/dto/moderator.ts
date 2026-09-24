import { GameState, RoomSummary } from ".";

export interface ModeratorRoomsListResponse {
	rooms: RoomSummary[],
	games: GameState[]
}