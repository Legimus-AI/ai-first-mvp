import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	schema: './src/slices/*/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL ?? 'postgresql://mvp:mvp@localhost:5433/mvp',
	},
})
