import { z } from 'zod'

const envSchema = z.object({
	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
	REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
	API_PORT: z.coerce.number().default(3001),
	CORS_ORIGIN: z.string().default('http://localhost:5174'),
	JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
	GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(raw: Record<string, string | undefined>): Env {
	return envSchema.parse(raw)
}
