// main.ts — ONLY file allowed to use runtime-specific APIs (Functional Core + Imperative Shell)
import { createApp } from './app'
import { initDb } from './db/client'
import { parseEnv } from './env'
import { initGemini } from './lib/gemini'
import { initRedis } from './lib/redis'
import { getAppLogger, setupLogger } from './logger'

await setupLogger()

const log = getAppLogger('server')
const env = parseEnv(process.env as Record<string, string | undefined>)

initDb(env.DATABASE_URL)
initRedis(env.REDIS_URL)
initGemini(env.GEMINI_API_KEY)

const app = createApp({ corsOrigin: env.CORS_ORIGIN, jwtSecret: env.JWT_SECRET })

log.info('Starting on port {port}', { port: env.API_PORT })

export default { port: env.API_PORT, fetch: app.fetch }
