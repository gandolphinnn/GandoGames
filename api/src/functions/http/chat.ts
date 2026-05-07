import { ChatMessage, ChatSendRequest } from '@gandogames/common/api';
import { InnerFunction, PlayfabCtx, registerFunction } from '../..';

const chatSendInner: InnerFunction<ChatSendRequest, void> = async (body, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
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
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	notifier.chatMessage(body.roomId, message);
};

registerFunction('chat_send', 'chat/send', chatSendInner);
