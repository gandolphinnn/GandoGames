import { PlayerRole, API } from '@gandogames/shared/dto';
import { InnerFunction, PlayfabCtx, registerEndpoint } from '../..';

const moderatorRoles = ['moderator', 'admin'] as readonly PlayerRole[];
async function roomList() {
	const rooms = await PlayfabCtx.rooms.list();
	return rooms
		.map(r => {
			r.settings = undefined;
			r.kickedPlayers = [];
			r.chat = [];
			return r;
		});
}

const moderatorRoomListInner: InnerFunction<typeof API.moderator.rooms.list> = async (_body, _params, _notifier, player) => {
	const isModerator = moderatorRoles.includes(player.role);
	if (!isModerator) throw new Error('Unauthorized');
	return await roomList();
};

const moderatorRoomDeleteInner: InnerFunction<typeof API.moderator.rooms.delete> = async (_body, params, notifier, player) => {
	const isModerator = moderatorRoles.includes(player.role);
	if (!isModerator) throw new Error('Unauthorized');
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');

	await PlayfabCtx.rooms.delete(params.roomId);
	notifier.roomDeleted(params.roomId);
	return await roomList();
};

registerEndpoint(API.moderator.rooms.list, moderatorRoomListInner);
registerEndpoint(API.moderator.rooms.delete, moderatorRoomDeleteInner);