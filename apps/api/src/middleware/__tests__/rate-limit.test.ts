import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { rateLimiter } from '../rate-limit'

function createTestApp(max: number, windowMs = 60_000) {
	const app = new Hono()
	app.use('*', rateLimiter({ max, windowMs }))
	app.get('/test', (c) => c.json({ ok: true }))
	return app
}

describe('rate limiter', () => {
	it('allows requests under the limit', async () => {
		const app = createTestApp(3)
		const res = await app.request('/test')
		expect(res.status).toBe(200)
		expect(res.headers.get('X-RateLimit-Limit')).toBe('3')
		expect(res.headers.get('X-RateLimit-Remaining')).toBe('2')
	})

	it('blocks requests over the limit', async () => {
		const app = createTestApp(2)
		await app.request('/test')
		await app.request('/test')
		const res = await app.request('/test')
		expect(res.status).toBe(429)
		const body = await res.json()
		expect(body.error.code).toBe('RATE_LIMITED')
		expect(res.headers.get('Retry-After')).toBeDefined()
	})

	it('returns correct remaining count', async () => {
		const app = createTestApp(5)
		const res1 = await app.request('/test')
		expect(res1.headers.get('X-RateLimit-Remaining')).toBe('4')
		const res2 = await app.request('/test')
		expect(res2.headers.get('X-RateLimit-Remaining')).toBe('3')
	})

	it('resets after window expires', async () => {
		const app = createTestApp(1, 10) // 10ms window
		await app.request('/test')
		const blocked = await app.request('/test')
		expect(blocked.status).toBe(429)

		await new Promise((r) => setTimeout(r, 20))
		const res = await app.request('/test')
		expect(res.status).toBe(200)
	})
})
