import { GameType } from "../games";
import { RoomBaseRequest } from "./room";

export interface GameBaseRequest extends RoomBaseRequest {
	game: GameType,
}

export interface GameActionRequest extends GameBaseRequest {
	action: string,
	data: any,
}