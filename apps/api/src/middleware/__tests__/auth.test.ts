import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { describe, expect, it } from 'vitest'
import { authGuard } from '../auth'

const SECRET = 'test-secret-key'

function createTestApp(exclude: string[] = []) {
	const app = new Hono()
	app.use('*', authGuard({ secret: SECRET, exclude }))
	app.get('/protected', (c) => c.json({ ok: true }))
	app.get('/health', (c) => c.json({ status: 'ok' }))
	return app
}

describe('auth guard', () => {
	it('rejects requests without Authorization header', async () => {
		const app = createTestApp()
		const res = await app.request('/protected')
		expect(res.status).toBe(401)
	})

	it('rejects requests with invalid token', async () => {
		const app = createTestApp()
		const res = await app.request('/protected', {
			headers: { Authorization: 'Bearer invalid-token' },
		})
		expect(res.status).toBe(401)
	})

	it('allows requests with valid JWT', async () => {
		const app = createTestApp()
		const token = await sign({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET)
		const res = await app.request('/protected', {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.ok).toBe(true)
	})

	it('excludes specified paths from auth', async () => {
		const app = createTestApp(['/health'])
		const res = await app.request('/health')
		expect(res.status).toBe(200)
	})

	it('still protects non-excluded paths', async () => {
		const app = createTestApp(['/health'])
		const res = await app.request('/protected')
		expect(res.status).toBe(401)
	})
})
