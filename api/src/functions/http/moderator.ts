import { RoomBaseRequest, RoomData, BaseRequest, PlayerRole } from '@gandogames/shared/dto';
import { InnerFunction, PlayfabCtx, registerFunction } from '../..';

const moderatorRoles = ['moderator', 'admin'] as readonly PlayerRole[];

const moderatorRoomListInner: InnerFunction<BaseRequest, RoomData[]> = async (_body, _notifier, player) => {
	const isModerator = moderatorRoles.includes(player.role);
	if (!isModerator) throw new Error('Unauthorized');
	const rooms = await PlayfabCtx.rooms.list();
	return rooms
		.map(r => {
			r.settings = undefined;
			r.kickedPlayers = [];
			r.chat = [];
			return r;
		});
};

const moderatorRoomDeleteInner: InnerFunction<RoomBaseRequest, void> = async (body, notifier, player) => {
	const isModerator = moderatorRoles.includes(player.role);
	if (!isModerator) throw new Error('Unauthorized');
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');

	await PlayfabCtx.rooms.delete(body.roomId);
	notifier.roomDeleted(body.roomId);
};

// room/create has no roomId yet and room/list & room/get are read-only, so none take the lock
// (room/get opts out explicitly). The rest mutate room state and are auto-locked per room (their
// request carries a roomId) so concurrent calls — e.g. two players joining at once — can't
// overwrite each other.
registerFunction('moderator_room_list', 'moderator/rooms/list', moderatorRoomListInner);
registerFunction('moderator_room_delete', 'moderator/rooms/delete', moderatorRoomDeleteInner);