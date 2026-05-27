import { test, expect, Page } from '@playwright/test';

const MOCK_AUTH = {
	sessionTicket: 'e2e-session-ticket',
	player: { id: 'e2e-player', name: 'E2EGuest' },
};

async function mockApiDefaults(page: Page): Promise<void> {
	await page.route('**/api/auth/guestLogin', route => route.fulfill({ json: MOCK_AUTH }));
	await page.route('**/api/auth/login', route => route.fulfill({ json: MOCK_AUTH }));
	await page.route('**/api/rooms/list', route => route.fulfill({ json: [] }));
	// SignalR negotiate returns empty — prevents connection attempts in tests.
	await page.route('**/api/signalr/negotiate**', route =>
		route.fulfill({ json: { url: '', accessToken: '' } }),
	);
}

test.describe('Login page', () => {
	test.beforeEach(async ({ page }) => {
		await mockApiDefaults(page);
		// Clear any leftover session so the noAuthGuard lets us reach /login.
		await page.addInitScript(() => localStorage.clear());
	});

	test('renders login form with all expected elements', async ({ page }) => {
		await page.goto('/login');
		await expect(page.locator('h1')).toHaveText('Welcome back');
		await expect(page.locator('#email')).toBeVisible();
		await expect(page.locator('#password')).toBeVisible();
		await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /continue as guest/i })).toBeVisible();
	});

	test('shows signup link', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
	});

	test('shows email validation error on blur with invalid email', async ({ page }) => {
		await page.goto('/login');
		await page.locator('#email').fill('not-an-email');
		await page.locator('#email').blur();
		await expect(page.locator('.field-error')).toContainText('valid email');
	});

	test('shows required error when email is left blank and blurred', async ({ page }) => {
		await page.goto('/login');
		await page.locator('#email').click();
		await page.locator('#email').blur();
		await expect(page.locator('.field-error').first()).toContainText('required');
	});

	test('guest login succeeds and redirects to /play', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('button', { name: /continue as guest/i }).click();
		await expect(page).toHaveURL(/\/play/, { timeout: 10_000 });
	});

	test('login with credentials calls API and redirects to /play', async ({ page }) => {
		await page.goto('/login');
		await page.locator('#email').fill('alice@example.com');
		await page.locator('#password').fill('password123');
		await page.getByRole('button', { name: /log in/i }).click();
		await expect(page).toHaveURL(/\/play/, { timeout: 10_000 });
	});

	test('shows error message when login API fails', async ({ page }) => {
		await page.route('**/api/auth/login', route =>
			route.fulfill({ status: 401, json: { error: 'Invalid credentials' } }),
		);
		await page.goto('/login');
		await page.locator('#email').fill('wrong@example.com');
		await page.locator('#password').fill('wrong');
		await page.getByRole('button', { name: /log in/i }).click();
		await expect(page.locator('.auth-error')).toBeVisible({ timeout: 5_000 });
	});
});

test.describe('Auth guard', () => {
	test('redirects unauthenticated users from / to /login', async ({ page }) => {
		await page.addInitScript(() => localStorage.clear());
		await page.goto('/');
		await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
	});

	test('redirects logged-in users away from /login to /play', async ({ page }) => {
		await mockApiDefaults(page);
		// Pre-seed localStorage so authGuard sees a valid session.
		await page.addInitScript((auth: object) => {
			localStorage.setItem('gg_auth', JSON.stringify(auth));
		}, { ...MOCK_AUTH, isGuest: false });
		await page.goto('/login');
		await expect(page).toHaveURL(/\/play/, { timeout: 5_000 });
	});
});
