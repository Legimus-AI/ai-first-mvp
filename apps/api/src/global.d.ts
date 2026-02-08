// Minimal process.env type declaration for auth routes
// This is an exception to the isomorphic code rule — auth routes are backend-only

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			JWT_SECRET: string
			DATABASE_URL: string
			REDIS_URL?: string
			API_PORT?: string
			CORS_ORIGIN?: string
			GEMINI_API_KEY: string
		}
	}

	const process: {
		env: NodeJS.ProcessEnv
	}
}

export {}
