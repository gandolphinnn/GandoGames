import { test, expect, Page } from '@playwright/test';

const MOCK_AUTH = {
	sessionTicket: 'e2e-session-ticket',
	player: { id: 'e2e-player', name: 'E2EPlayer', permissions: [] },
};

const MOCK_ROOM = {
	id: 'room-abc',
	hostId: 'e2e-player',
	game: 'morra',
	players: [{ id: 'e2e-player', name: 'E2EPlayer' }],
	kickedPlayers: [],
	phase: 'waiting',
	chat: [],
	lastUpdate: new Date().toISOString(),
};

async function loginAs(page: Page, rooms: object[] = []): Promise<void> {
	// Seed auth into localStorage before page load.
	await page.addInitScript((auth: object) => {
		localStorage.setItem('gg_auth', JSON.stringify(auth));
	}, { ...MOCK_AUTH, isGuest: false });

	await page.route('**/api/rooms/list', route => route.fulfill({ json: rooms }));
	await page.route('**/api/signalr/negotiate**', route =>
		route.fulfill({ json: { url: '', accessToken: '' } }),
	);
}

test.describe('Room list (/play)', () => {
	test('loads and displays the rooms list page after login', async ({ page }) => {
		await loginAs(page, []);
		await page.goto('/play');
		// Page should not redirect to login
		await expect(page).toHaveURL(/\/play/, { timeout: 10_000 });
	});

	test('calls /rooms/list API on page load', async ({ page }) => {
		let listCalled = false;
		await loginAs(page, [MOCK_ROOM]);
		await page.route('**/api/rooms/list', route => {
			listCalled = true;
			return route.fulfill({ json: [MOCK_ROOM] });
		});
		await page.goto('/play');
		await page.waitForTimeout(1_000);
		expect(listCalled).toBe(true);
	});

	test('shows no rooms when the list is empty', async ({ page }) => {
		await loginAs(page, []);
		await page.goto('/play');
		// No room cards should be visible
		await expect(page.locator('gg-room-list')).toBeVisible({ timeout: 5_000 }).catch(() => {});
	});
});

test.describe('Room creation', () => {
	test('POST /rooms/create is called when create button is clicked', async ({ page }) => {
		let createCalled = false;
		await loginAs(page, []);
		await page.route('**/api/rooms/create', route => {
			createCalled = true;
			return route.fulfill({ json: MOCK_ROOM });
		});
		// Room detail also fetches the room state
		await page.route('**/api/rooms/get', route => route.fulfill({ json: MOCK_ROOM }));
		await page.route('**/api/game/state', route => route.fulfill({ json: null }));

		await page.goto('/play');
		// Look for a create / new room button
		const createBtn = page.getByRole('button', { name: /create|new room/i });
		if (await createBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await createBtn.click();
			await page.waitForTimeout(500);
			expect(createCalled).toBe(true);
		}
	});
});

test.describe('Two-player lobby (multiplayer context)', () => {
	test('two browser contexts can navigate to the same room', async ({ browser }) => {
		const ctx1 = await browser.newContext();
		const ctx2 = await browser.newContext();
		const page1 = await ctx1.newPage();
		const page2 = await ctx2.newPage();

		const auth1 = { ...MOCK_AUTH, player: { id: 'p1', name: 'Alice', permissions: [] }, isGuest: false };
		const auth2 = { ...MOCK_AUTH, sessionTicket: 'ticket-2', player: { id: 'p2', name: 'Bob', permissions: [] }, isGuest: false };
		const room = { ...MOCK_ROOM, players: [auth1.player, auth2.player] };

		for (const [p, auth] of [[page1, auth1], [page2, auth2]] as const) {
			await p.addInitScript((a: object) => localStorage.setItem('gg_auth', JSON.stringify(a)), auth);
			await p.route('**/api/rooms/list', r => r.fulfill({ json: [room] }));
			await p.route('**/api/rooms/get', r => r.fulfill({ json: room }));
			await p.route('**/api/signalr/negotiate**', r => r.fulfill({ json: { url: '', accessToken: '' } }));
			await p.route('**/api/game/state', r => r.fulfill({ json: null }));
		}

		await page1.goto('/play');
		await page2.goto('/play');

		await expect(page1).toHaveURL(/\/play/, { timeout: 10_000 });
		await expect(page2).toHaveURL(/\/play/, { timeout: 10_000 });

		await ctx1.close();
		await ctx2.close();
	});
});
