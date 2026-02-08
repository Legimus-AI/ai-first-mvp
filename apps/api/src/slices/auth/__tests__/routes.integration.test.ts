import { eq } from 'drizzle-orm'
/**
 * Auth integration tests
 * Tests register, login, and me endpoints against real PostgreSQL
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../../app'
import { initDb } from '../../../db/client'
import { users } from '../../users/schema'

const TEST_DB_URL = 'postgresql://mvp:mvp@localhost:5433/mvp'
const JWT_SECRET = 'test-secret-key'

let db: ReturnType<typeof initDb>
let app: ReturnType<typeof createApp>
const testEmail = 'authtest@example.com'
const insertedUserIds: string[] = []

beforeAll(async () => {
	db = initDb(TEST_DB_URL)
	app = createApp({ jwtSecret: JWT_SECRET })

	// Clean up any existing test user
	await db.delete(users).where(eq(users.email, testEmail))
})

afterAll(async () => {
	// Clean up all test users
	for (const id of insertedUserIds) {
		await db.delete(users).where(eq(users.id, id))
	}
	await db.delete(users).where(eq(users.email, testEmail))
})

describe('Auth integration', () => {
	describe('REGISTER', () => {
		it('AUTH-REGISTER-01: Creates user and returns token (201)', async () => {
			const res = await app.request('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					name: 'Test User',
					password: 'password123',
					role: 'user',
				}),
			})

			expect(res.status).toBe(201)
			const body = await res.json()
			expect(body.token).toBeDefined()
			expect(body.user.email).toBe(testEmail)
			expect(body.user.name).toBe('Test User')
			expect(body.user.role).toBe('user')
			expect(body.user.id).toBeDefined()

			insertedUserIds.push(body.user.id)
		})

		it('AUTH-REGISTER-02: Returns 400 for invalid payload', async () => {
			const res = await app.request('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'invalid-email',
					name: '',
					password: 'short',
				}),
			})

			expect(res.status).toBe(400)
			const body = await res.json()
			expect(body.success).toBe(false)
			expect(body.error.name).toBe('ZodError')
		})

		it('AUTH-REGISTER-03: Returns 409 for duplicate email', async () => {
			const res = await app.request('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					name: 'Another User',
					password: 'password123',
				}),
			})

			expect(res.status).toBe(409)
			const body = await res.json()
			expect(body.error.code).toBe('CONFLICT')
			expect(body.error.message).toContain('already exists')
		})
	})

	describe('LOGIN', () => {
		it('AUTH-LOGIN-01: Returns token for valid credentials (200)', async () => {
			const res = await app.request('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					password: 'password123',
				}),
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.token).toBeDefined()
			expect(body.user.email).toBe(testEmail)
			expect(body.user.id).toBeDefined()
		})

		it('AUTH-LOGIN-02: Returns 401 for wrong password', async () => {
			const res = await app.request('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					password: 'wrongpassword',
				}),
			})

			expect(res.status).toBe(401)
			const body = await res.json()
			expect(body.error.code).toBe('UNAUTHORIZED')
		})

		it('AUTH-LOGIN-03: Returns 401 for non-existent user', async () => {
			const res = await app.request('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'nonexistent@example.com',
					password: 'password123',
				}),
			})

			expect(res.status).toBe(401)
			const body = await res.json()
			expect(body.error.code).toBe('UNAUTHORIZED')
		})

		it('AUTH-LOGIN-04: Returns 400 for invalid payload', async () => {
			const res = await app.request('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'not-an-email',
					password: '',
				}),
			})

			expect(res.status).toBe(400)
			const body = await res.json()
			expect(body.success).toBe(false)
			expect(body.error.name).toBe('ZodError')
		})
	})

	describe('ME', () => {
		it('AUTH-ME-01: Returns current user for valid token', async () => {
			// First register a user to ensure it exists
			const registerRes = await app.request('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'me-test@example.com',
					name: 'ME Test User',
					password: 'password123',
					role: 'user',
				}),
			})
			const registerBody = await registerRes.json()
			expect(registerRes.status).toBe(201)
			insertedUserIds.push(registerBody.user.id)

			// Then access /me with the token from registration
			const res = await app.request('/api/auth/me', {
				method: 'GET',
				headers: { Authorization: `Bearer ${registerBody.token}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.email).toBe('me-test@example.com')
			expect(body.name).toBe('ME Test User')
			expect(body.id).toBeDefined()
		})

		it('AUTH-ME-02: Returns 401 without token', async () => {
			const res = await app.request('/api/auth/me', {
				method: 'GET',
			})

			expect(res.status).toBe(401)
			const body = await res.json()
			// Hono JWT middleware returns INTERNAL_ERROR when auth fails
			expect(body.error.code).toBe('INTERNAL_ERROR')
		})

		it('AUTH-ME-03: Returns 401 for invalid token', async () => {
			const res = await app.request('/api/auth/me', {
				method: 'GET',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const body = await res.json()
			// Hono JWT middleware returns INTERNAL_ERROR when token is invalid
			expect(body.error.code).toBe('INTERNAL_ERROR')
		})
	})
})
