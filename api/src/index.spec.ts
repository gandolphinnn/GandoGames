import { pfPromise } from '.';
import { InnerFunctionNotifier } from './types';
import type { RoomData } from '@gandogames/shared/dto';

describe('pfPromise', () => {
	it('resolves with result.data on success', async () => {
		const data = { foo: 'bar' };
		const call = (cb: any) => cb(null, { data });
		await expect(pfPromise(call as any)).resolves.toEqual(data);
	});

	it('rejects with the PlayFab errorMessage on failure', async () => {
		const call = (cb: any) => cb({ errorMessage: 'Title not found' }, null);
		await expect(pfPromise(call as any)).rejects.toThrow('Title not found');
	});

	it('rejects with generic message when errorMessage is absent', async () => {
		const call = (cb: any) => cb({}, null);
		await expect(pfPromise(call as any)).rejects.toThrow('PlayFab error');
	});
});

describe('InnerFunctionNotifier', () => {
	let notifier: InnerFunctionNotifier;
	let mockCtx: { extraOutputs: { set: jest.Mock } };

	beforeEach(() => {
		notifier = new InnerFunctionNotifier();
		mockCtx = { extraOutputs: { set: jest.fn() } };
	});

	it('has default errorCode of 500', () => {
		expect(notifier.errorCode).toBe(500);
	});

	it('does not call extraOutputs.set when no messages were queued', () => {
		notifier.prepareContext(mockCtx as any);
		expect(mockCtx.extraOutputs.set).not.toHaveBeenCalled();
	});

	it('roomUpsert queues a roomUpsert SignalR message', () => {
		notifier.roomUpsert({ id: 'room-1' } as RoomData);
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toContainEqual(expect.objectContaining({ target: 'roomUpsert', arguments: [{ id: 'room-1' }] }));
	});

	it('roomDeleted queues a roomDeleted SignalR message', () => {
		notifier.roomDeleted('room-42');
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toContainEqual(expect.objectContaining({ target: 'roomDeleted', arguments: ['room-42'] }));
	});

	it('roomDeletedForPlayer queues a user-targeted roomDeleted message', () => {
		notifier.roomDeletedForPlayer('user-7', 'room-42');
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toContainEqual(expect.objectContaining({
			target: 'roomDeleted',
			arguments: ['room-42'],
			userId: 'user-7',
		}));
	});

	it('addToGroup queues a group join action with prefixed group name', () => {
		notifier.addToGroup('user-5', 'xyz');
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toContainEqual(expect.objectContaining({
			action: 'add',
			userId: 'user-5',
			groupName: 'room-xyz',
		}));
	});

	it('removeFromGroup queues a group leave action with prefixed group name', () => {
		notifier.removeFromGroup('user-5', 'xyz');
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toContainEqual(expect.objectContaining({
			action: 'remove',
			userId: 'user-5',
			groupName: 'room-xyz',
		}));
	});

	it('gameStateUpdated queues a group-targeted message', () => {
		notifier.gameStateUpdated('room-9', { phase: 'picking' });
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toContainEqual(expect.objectContaining({
			target: 'gameStateUpdated',
			groupName: 'room-room-9',
		}));
	});

	it('chatMessage queues a group-targeted chat message', () => {
		const msg = { playerId: 'p1', playerName: 'Alice', text: 'hi', timestamp: new Date() };
		notifier.chatMessage('room-3', msg as any);
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toContainEqual(expect.objectContaining({
			target: 'chatMessage',
			groupName: 'room-room-3',
		}));
	});

	it('gameStateUpdatedForPlayer queues a user-targeted gameStateUpdated message', () => {
		notifier.gameStateUpdatedForPlayer('user-3', 'room-7', { lastUpdate: new Date() } as any);
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toContainEqual(expect.objectContaining({
			target: 'gameStateUpdated',
			userId: 'user-3',
			arguments: ['room-7', expect.anything()],
		}));
	});

	it('roomInviteForPlayer queues a user-targeted roomInvite message', () => {
		notifier.roomInviteForPlayer('user-8', 'room-5', 'pankov');
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toContainEqual(expect.objectContaining({
			target: 'roomInvite',
			userId: 'user-8',
			arguments: ['room-5', 'pankov'],
		}));
	});

	it('accumulates multiple messages and sends them all at once', () => {
		notifier.roomDeleted('r1');
		notifier.roomDeleted('r2');
		notifier.roomUpsert({ id: 'r3' } as RoomData);
		notifier.prepareContext(mockCtx as any);
		const [, messages] = mockCtx.extraOutputs.set.mock.calls[0];
		expect(messages).toHaveLength(3);
	});
});
