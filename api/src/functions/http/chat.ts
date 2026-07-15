import { API, ChatMessage } from '@gandogames/shared/dto';
import { InnerFunction, PlayfabCtx, registerEndpoint } from '../..';

const chatSendInner: InnerFunction<typeof API.chat.send> = async (body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	if (!room.players.some(p => p.id === player.id)) throw new Error('You are not in this room');

	const text = body.text?.trim() ?? '';
	if (!text) throw new Error('Message cannot be empty');
	if (text.length > 500) throw new Error('Message too long');

	const message: ChatMessage = {
		playerId: player.id,
		playerName: player.name,
		text,
		timestamp: new Date(),
	};

	room.chat = [...(room.chat ?? []), message];
	await PlayfabCtx.rooms.upsert(params.roomId, room);
	notifier.chatMessage(params.roomId, message);
};

registerEndpoint(API.chat.send, chatSendInner);
