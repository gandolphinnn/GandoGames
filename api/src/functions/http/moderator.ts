import { PlayerRole, API, GAMES_CONFIG, GameId, GameState, RoomSummary, GamePlayer } from '@gandogames/shared/dto';
import { InnerFunction, PlayfabCtx, registerEndpoint } from '../..';

const moderatorRoles = ['moderator', 'admin'] as readonly PlayerRole[];
function ensureCallerPermissions(player: GamePlayer) {
	const isModerator = moderatorRoles.includes(player.role);
	if (!isModerator) throw new Error('Unauthorized');
}


async function roomList() {
	const rooms = await PlayfabCtx.rooms.list();
	return rooms
		.map(r => {
			r.settings = undefined;
			r.kickedPlayers = [];
			r.chat = [];
			return r as RoomSummary;
		});
}
async function gamesList() {
	const gamesIds = Object.keys(GAMES_CONFIG);
	const games: GameState[] = [];
	for(const gameId of gamesIds) {
		const arr = await PlayfabCtx.game[gameId as GameId].list();
		if (arr) games.push(...arr)
	}
	return games;
}

const moderatorRoomListInner: InnerFunction<typeof API.moderator.rooms.list> = async (_body, _params, _notifier, player) => {
	ensureCallerPermissions(player);
	return {rooms: await roomList(), games: await gamesList()};
};

const moderatorRoomDeleteInner: InnerFunction<typeof API.moderator.rooms.delete> = async (_body, params, notifier, player) => {
	ensureCallerPermissions(player);

	await PlayfabCtx.rooms.delete(params.roomId);
	notifier.roomDeleted(params.roomId);
	return {rooms: await roomList(), games: await gamesList()};
};

registerEndpoint(API.moderator.rooms.list, moderatorRoomListInner);
registerEndpoint(API.moderator.rooms.delete, moderatorRoomDeleteInner);