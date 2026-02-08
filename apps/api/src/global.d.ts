// Minimal process.env type declaration for main.ts and seed.ts (imperative shell only)
// All other code must import typed config from env.ts — never use process.env directly

declare module 'hono' {
	interface ContextVariableMap {
		jwtSecret: string
	}
}

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			JWT_SECRET: string
			DATABASE_URL: string
			REDIS_URL?: string | undefined
			API_PORT?: string | undefined
			CORS_ORIGIN?: string | undefined
			GEMINI_API_KEY: string
		}
	}

	const process: {
		env: NodeJS.ProcessEnv
	}
}

export {}
