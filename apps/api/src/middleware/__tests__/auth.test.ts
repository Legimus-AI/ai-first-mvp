import { AppError } from '@repo/shared'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { describe, expect, it } from 'vitest'
import { authGuard, requireRole } from '../auth'

const SECRET = 'test-secret-key'

function createTestApp(exclude: string[] = []) {
	const app = new Hono()
	app.use('*', authGuard({ secret: SECRET, exclude }))
	app.get('/protected', (c) => c.json({ ok: true }))
	app.get('/health', (c) => c.json({ status: 'ok' }))
	return app
}

function createRoleApp() {
	const app = new Hono()
	app.use('*', authGuard({ secret: SECRET }))

	app.onError((err, c) => {
		if (err instanceof AppError) {
			return c.json({ error: { code: err.code, message: err.message } }, err.status as 403)
		}
		return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500)
	})

	app.use('/admin/*', requireRole('admin'))
	app.get('/admin/users', (c) => c.json({ ok: true }))
	app.get('/dashboard', (c) => c.json({ ok: true }))
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

describe('requireRole', () => {
	it('allows admin to access admin routes', async () => {
		const app = createRoleApp()
		const token = await sign(
			{ sub: 'user-1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 },
			SECRET,
		)
		const res = await app.request('/admin/users', {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
	})

	it('rejects non-admin from admin routes with 403', async () => {
		const app = createRoleApp()
		const token = await sign(
			{ sub: 'user-2', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 },
			SECRET,
		)
		const res = await app.request('/admin/users', {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(403)
		const body = await res.json()
		expect(body.error.code).toBe('FORBIDDEN')
	})

	it('allows non-admin to access non-admin routes', async () => {
		const app = createRoleApp()
		const token = await sign(
			{ sub: 'user-2', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 },
			SECRET,
		)
		const res = await app.request('/dashboard', {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
	})

	it('rejects JWT without role claim', async () => {
		const app = createRoleApp()
		const token = await sign({ sub: 'user-3', exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET)
		const res = await app.request('/admin/users', {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(403)
	})
})
