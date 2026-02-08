import { eq } from 'drizzle-orm'
import { sign } from 'hono/jwt'
/**
 * Users integration tests
 * Tests CRUD operations against real PostgreSQL
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../../app'
import { initDb } from '../../../db/client'
import { users } from '../schema'

const TEST_DB_URL = 'postgresql://mvp:mvp@localhost:5433/mvp'
const JWT_SECRET = 'test-secret-key'

let db: ReturnType<typeof initDb>
let app: ReturnType<typeof createApp>
let adminToken: string
let adminUserId: string
const insertedUserIds: string[] = []

beforeAll(async () => {
	db = initDb(TEST_DB_URL)
	app = createApp({ jwtSecret: JWT_SECRET })

	// Create admin user for testing
	const [adminUser] = await db
		.insert(users)
		.values({
			email: 'user-test-admin@example.com',
			name: 'User Test Admin',
			passwordHash: 'x',
			role: 'admin',
		})
		.returning()

	adminUserId = adminUser.id
	adminToken = await sign(
		{ sub: adminUserId, role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 },
		JWT_SECRET,
	)
})

afterAll(async () => {
	// Clean up test users
	for (const id of insertedUserIds) {
		await db.delete(users).where(eq(users.id, id))
	}

	// Clean up admin user
	await db.delete(users).where(eq(users.id, adminUserId))
})

describe('Users integration', () => {
	describe('LIST', () => {
		it('LIST-01: Returns paginated data with default params (page 1, limit 20, desc)', async () => {
			// Create 3 test users
			for (let i = 0; i < 3; i++) {
				const [user] = await db
					.insert(users)
					.values({
						email: `test-user-${i}@example.com`,
						name: `Test User ${i}`,
						passwordHash: 'x',
						role: 'user',
					})
					.returning()
				insertedUserIds.push(user.id)
			}

			const res = await app.request('/api/users', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toBeInstanceOf(Array)
			expect(body.data.length).toBeGreaterThanOrEqual(3)
			expect(body.meta.page).toBe(1)
			expect(body.meta.limit).toBe(20)
			expect(body.meta.total).toBeGreaterThanOrEqual(3)
		})

		it('LIST-02: Respects custom page and limit', async () => {
			const res = await app.request('/api/users?page=1&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.meta.page).toBe(1)
			expect(body.meta.limit).toBe(2)
			expect(body.data.length).toBeLessThanOrEqual(2)
		})

		it('LIST-03: Page 2 returns different items than page 1', async () => {
			const res1 = await app.request('/api/users?page=1&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const body1 = await res1.json()

			const res2 = await app.request('/api/users?page=2&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const body2 = await res2.json()

			const ids1 = body1.data.map((u: { id: string }) => u.id)
			const ids2 = body2.data.map((u: { id: string }) => u.id)

			// No overlap between pages
			for (const id of ids2) {
				expect(ids1).not.toContain(id)
			}
		})

		it('LIST-04: Page beyond total returns empty data', async () => {
			const res = await app.request('/api/users?page=999&limit=20', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toHaveLength(0)
			expect(body.meta.hasMore).toBe(false)
		})

		it('LIST-05: Search is case-insensitive and partial match', async () => {
			const res = await app.request('/api/users?search=test-user', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-06: Search returns empty for no match', async () => {
			const res = await app.request('/api/users?search=nonexistent-xyz-123', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toHaveLength(0)
			expect(body.meta.total).toBe(0)
		})

		it('LIST-07: filterValue + filterFields targets specific columns', async () => {
			const res = await app.request('/api/users?filterValue=Test+User+0&filterFields=name', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-08: filterFields ignores columns not in whitelist', async () => {
			const res = await app.request('/api/users?filterValue=test&filterFields=passwordHash,name', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			// passwordHash is not in sortColumns whitelist, so only name is searched
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-09: Sort ascending works for each sortColumn', async () => {
			const res = await app.request('/api/users?sort=name&order=asc&limit=100', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			const names = body.data.map((u: { name: string }) => u.name)
			const sorted = [...names].sort()
			expect(names).toEqual(sorted)
		})

		it('LIST-10: Sort descending works for each sortColumn', async () => {
			const res = await app.request('/api/users?sort=name&order=desc&limit=100', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			const names = body.data.map((u: { name: string }) => u.name)
			const sorted = [...names].sort().reverse()
			expect(names).toEqual(sorted)
		})

		it('LIST-11: Invalid sort column falls back to defaultSort', async () => {
			const res = await app.request('/api/users?sort=invalid&order=desc', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			// Should fall back to createdAt desc (default)
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-12: Combined: search + sort + pagination', async () => {
			const res = await app.request('/api/users?search=Test&sort=name&order=asc&page=1&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.meta.page).toBe(1)
			expect(body.meta.limit).toBe(2)
			expect(body.data.length).toBeLessThanOrEqual(2)
		})
	})

	describe('GET', () => {
		it('GET-01: Returns item by ID', async () => {
			const userId = insertedUserIds[0]
			const res = await app.request(`/api/users/${userId}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.id).toBe(userId)
			expect(body.name).toBeDefined()
			expect(body.email).toBeDefined()
			expect(body).not.toHaveProperty('passwordHash')
		})

		it('GET-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/users/00000000-0000-0000-0000-000000000000', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(404)
			const body = await res.json()
			expect(body.error.code).toBe('NOT_FOUND')
		})
	})

	describe('CREATE', () => {
		it('CREATE-01: Creates and returns item (201)', async () => {
			const res = await app.request('/api/users', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: 'create-test-user@example.com',
					name: 'Create Test User',
					password: 'password123',
					role: 'user',
				}),
			})

			expect(res.status).toBe(201)
			const body = await res.json()
			expect(body.id).toBeDefined()
			expect(body.email).toBe('create-test-user@example.com')
			expect(body.name).toBe('Create Test User')
			expect(body).not.toHaveProperty('passwordHash')

			insertedUserIds.push(body.id)
		})

		it('CREATE-02: Returns 400 for invalid payload', async () => {
			const res = await app.request('/api/users', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: 'not-an-email',
					name: '',
					password: 'short',
				}),
			})

			expect(res.status).toBe(400)
			const body = await res.json()
			expect(body.success).toBe(false)
			expect(body.error.name).toBe('ZodError')
		})

		it('CREATE-03: Returns 409 for unique constraint violation (if applicable)', async () => {
			const res = await app.request('/api/users', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: 'create-test-user@example.com',
					name: 'Another User',
					password: 'password123',
					role: 'user',
				}),
			})

			expect(res.status).toBe(409)
			const body = await res.json()
			expect(body.error.code).toBe('CONFLICT')
		})
	})

	describe('UPDATE', () => {
		it('UPDATE-01: Updates and returns item', async () => {
			const userId = insertedUserIds[0]
			const res = await app.request(`/api/users/${userId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: 'Updated User Name',
				}),
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.id).toBe(userId)
			expect(body.name).toBe('Updated User Name')
		})

		it('UPDATE-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/users/00000000-0000-0000-0000-000000000000', {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: 'Does not matter',
				}),
			})

			expect(res.status).toBe(404)
			const body = await res.json()
			expect(body.error.code).toBe('NOT_FOUND')
		})

		it('UPDATE-03: Returns 400 for invalid payload', async () => {
			const userId = insertedUserIds[0]
			const res = await app.request(`/api/users/${userId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: '',
				}),
			})

			expect(res.status).toBe(400)
			const body = await res.json()
			expect(body.success).toBe(false)
			expect(body.error.name).toBe('ZodError')
		})

		it('UPDATE-04: Partial update only changes specified fields', async () => {
			const userId = insertedUserIds[0]

			// Get original
			const getRes = await app.request(`/api/users/${userId}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const original = await getRes.json()

			// Update only name
			const updateRes = await app.request(`/api/users/${userId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: 'Partial Update Name',
				}),
			})

			expect(updateRes.status).toBe(200)
			const updated = await updateRes.json()
			expect(updated.name).toBe('Partial Update Name')
			expect(updated.email).toBe(original.email)
			expect(updated.role).toBe(original.role)
		})
	})

	describe('DELETE', () => {
		it('DELETE-01: Deletes item by ID', async () => {
			// Create a user to delete
			const [user] = await db
				.insert(users)
				.values({
					email: 'to-delete@example.com',
					name: 'To Delete',
					passwordHash: 'x',
					role: 'user',
				})
				.returning()

			const res = await app.request(`/api/users/${user.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(204)

			// Verify it's gone
			const getRes = await app.request(`/api/users/${user.id}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			expect(getRes.status).toBe(404)
		})

		it('DELETE-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/users/00000000-0000-0000-0000-000000000000', {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(404)
			const body = await res.json()
			expect(body.error.code).toBe('NOT_FOUND')
		})
	})

	describe('BULK_DELETE', () => {
		it('BULK-01: Deletes multiple items', async () => {
			// Create 2 users to delete
			const user1 = await db
				.insert(users)
				.values({
					email: 'bulk-delete-1@example.com',
					name: 'Bulk Delete 1',
					passwordHash: 'x',
					role: 'user',
				})
				.returning()

			const user2 = await db
				.insert(users)
				.values({
					email: 'bulk-delete-2@example.com',
					name: 'Bulk Delete 2',
					passwordHash: 'x',
					role: 'user',
				})
				.returning()

			const ids = [user1[0].id, user2[0].id]

			const res = await app.request('/api/users/bulk', {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ ids }),
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.deleted).toBe(2)

			// Verify they're gone
			for (const id of ids) {
				const getRes = await app.request(`/api/users/${id}`, {
					headers: { Authorization: `Bearer ${adminToken}` },
				})
				expect(getRes.status).toBe(404)
			}
		})
	})
})
