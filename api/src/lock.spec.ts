import { withInProcessLock } from './lock';

// These tests cover the MOCK_BACKEND path (the in-process async mutex). The Blob-lease path
// needs a real Azure Storage account, so it is left to integration/manual verification.

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('withInProcessLock', () => {
	it('serializes concurrent calls on the same key (no overlap)', async () => {
		let active = 0;
		let maxActive = 0;
		const task = async () => {
			active++;
			maxActive = Math.max(maxActive, active);
			await delay(10);
			active--;
		};

		await Promise.all([
			withInProcessLock('room-1', task),
			withInProcessLock('room-1', task),
			withInProcessLock('room-1', task),
		]);

		expect(maxActive).toBe(1);
	});

	it('does not block calls on different keys', async () => {
		let active = 0;
		let maxActive = 0;
		const task = async () => {
			active++;
			maxActive = Math.max(maxActive, active);
			await delay(10);
			active--;
		};

		await Promise.all([
			withInProcessLock('room-a', task),
			withInProcessLock('room-b', task),
		]);

		expect(maxActive).toBe(2);
	});

	it('runs queued calls in submission order', async () => {
		const order: number[] = [];
		await Promise.all([1, 2, 3].map(n =>
			withInProcessLock('room-1', async () => {
				await delay(5);
				order.push(n);
			}),
		));

		expect(order).toEqual([1, 2, 3]);
	});

	it('releases the lock when a call throws, so later calls proceed', async () => {
		await expect(
			withInProcessLock('room-1', async () => { throw new Error('boom'); }),
		).rejects.toThrow('boom');

		const result = await withInProcessLock('room-1', async () => 'ok');
		expect(result).toBe('ok');
	});
});
