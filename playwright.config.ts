import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},
	webServer: [
		{
			command:
				'DATABASE_URL=postgresql://skeleton:skeleton@localhost:5432/skeleton bun apps/api/src/main.ts',
			port: 3000,
			reuseExistingServer: !process.env.CI,
		},
		{
			command: 'pnpm dev:web',
			port: 5173,
			reuseExistingServer: !process.env.CI,
		},
	],
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' },
		},
	],
})
