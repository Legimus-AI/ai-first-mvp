/// <reference types="vite/client" />
import { z } from 'zod'

const envSchema = z.object({
	VITE_API_URL: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

export function getEnv(): Env {
	return envSchema.parse(import.meta.env)
}
