import type { MiddlewareHandler } from 'hono'

export interface RateLimitConfig {
	windowMs?: number
	max?: number
}

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX = 100

export function rateLimiter(config: RateLimitConfig = {}): MiddlewareHandler {
	const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS
	const max = config.max ?? DEFAULT_MAX
	const hits = new Map<string, { count: number; resetAt: number }>()
	let lastCleanup = Date.now()

	return async (c, next) => {
		const now = Date.now()

		// Lazy cleanup — no setInterval needed
		if (now - lastCleanup > windowMs) {
			for (const [key, entry] of hits) {
				if (entry.resetAt <= now) hits.delete(key)
			}
			lastCleanup = now
		}

		const ip =
			c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
			c.req.header('x-real-ip') ??
			'unknown'

		const entry = hits.get(ip)

		if (!entry || entry.resetAt <= now) {
			hits.set(ip, { count: 1, resetAt: now + windowMs })
			c.header('X-RateLimit-Limit', String(max))
			c.header('X-RateLimit-Remaining', String(max - 1))
			await next()
			return
		}

		entry.count++
		const remaining = Math.max(0, max - entry.count)
		c.header('X-RateLimit-Limit', String(max))
		c.header('X-RateLimit-Remaining', String(remaining))

		if (entry.count > max) {
			const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
			c.header('Retry-After', String(retryAfter))
			return c.json(
				{ error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
				429,
			)
		}

		await next()
	}
}
