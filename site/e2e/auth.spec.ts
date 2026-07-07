import { test, expect, Page } from '@playwright/test';

const MOCK_AUTH = {
	sessionTicket: 'e2e-session-ticket',
	player: { id: 'e2e-player', name: 'E2EGuest', icon: 'profile', theme: 'dark', language: 'en' },
};

async function mockApiDefaults(page: Page): Promise<void> {
	await page.route('**/api/auth/check', route => route.fulfill({ json: MOCK_AUTH }));
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
		await expect(page.locator('ion-input[formcontrolname="email"]')).toBeVisible();
		await expect(page.locator('ion-input[formcontrolname="password"]')).toBeVisible();
		await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /continue as guest/i })).toBeVisible();
	});

	test('shows signup link', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
	});

	test('shows email validation error on blur with invalid email', async ({ page }) => {
		await page.goto('/login');
		const emailInput = page.locator('ion-input[formcontrolname="email"]').locator('input');
		await emailInput.fill('not-an-email');
		await page.keyboard.press('Tab');
		await expect(page.locator('.field-error')).toContainText('valid email');
	});

	test('shows required error when email is left blank and blurred', async ({ page }) => {
		await page.goto('/login');
		const emailInput = page.locator('ion-input[formcontrolname="email"]').locator('input');
		await emailInput.click();
		await page.keyboard.press('Tab');
		await expect(page.locator('.field-error').first()).toContainText('required');
	});

	test('guest login succeeds and redirects to /play', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('button', { name: /continue as guest/i }).click();
		await expect(page).toHaveURL(/\/play/, { timeout: 10_000 });
	});

	test('login with credentials calls API and redirects to /play', async ({ page }) => {
		await page.goto('/login');
		await page.locator('ion-input[formcontrolname="email"]').locator('input').fill('alice@example.com');
		await page.locator('ion-input[formcontrolname="password"]').locator('input').fill('password123');
		await page.getByRole('button', { name: /log in/i }).click();
		await expect(page).toHaveURL(/\/play/, { timeout: 10_000 });
	});

	test('shows error toast when login API fails', async ({ page }) => {
		await page.route('**/api/auth/login', route =>
			route.fulfill({ status: 401, json: { error: 'Invalid credentials' } }),
		);
		await page.goto('/login');
		await page.locator('ion-input[formcontrolname="email"]').locator('input').fill('wrong@example.com');
		await page.locator('ion-input[formcontrolname="password"]').locator('input').fill('wrong');
		await page.getByRole('button', { name: /log in/i }).click();
		// Errors surface as a toast (BackendService toasts every failed call — see CLAUDE.md).
		await expect(page.locator('.toast-error .toast-message')).toHaveText('Invalid credentials', { timeout: 5_000 });
		await expect(page).toHaveURL(/\/login/); // failed login must not navigate away
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
		// Pre-seed the session ticket so UserService.init() restores the session.
		await page.addInitScript((ticket: string) => {
			localStorage.setItem('gg_session_ticket', ticket);
		}, MOCK_AUTH.sessionTicket);
		await page.goto('/login');
		await expect(page).toHaveURL(/\/play/, { timeout: 5_000 });
	});
});
