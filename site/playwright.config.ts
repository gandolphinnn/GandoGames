/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env['CI'],
	retries: process.env['CI'] ? 2 : 0,
	workers: process.env['CI'] ? 1 : undefined,
	reporter: [['html', { open: process.env['CI'] ? 'never' : 'on-failure', outputFolder: 'test-results' }]],
	use: {
		baseURL: 'http://localhost:1212',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
	// Start ng serve automatically; reuse a running instance when not in CI.
	webServer: {
		command: 'npm run start',
		url: 'http://localhost:1212',
		reuseExistingServer: !process.env['CI'],
		timeout: 120_000,
	},
});
