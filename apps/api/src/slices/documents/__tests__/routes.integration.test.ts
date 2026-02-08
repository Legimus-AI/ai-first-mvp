import { eq } from 'drizzle-orm'
import { sign } from 'hono/jwt'
/**
 * Documents integration tests
 * Tests CRUD operations against real PostgreSQL
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../../app'
import { initDb } from '../../../db/client'
import { bots } from '../../bots/schema'
import { users } from '../../users/schema'
import { documents } from '../schema'

const TEST_DB_URL = 'postgresql://mvp:mvp@localhost:5433/mvp'
const JWT_SECRET = 'test-secret-key'

let db: ReturnType<typeof initDb>
let app: ReturnType<typeof createApp>
let adminToken: string
let adminUserId: string
let testBotId: string
const insertedDocumentIds: string[] = []

beforeAll(async () => {
	db = initDb(TEST_DB_URL)
	app = createApp({ jwtSecret: JWT_SECRET })

	// Create admin user for testing
	const [adminUser] = await db
		.insert(users)
		.values({
			email: 'doc-test-admin@example.com',
			name: 'Doc Test Admin',
			passwordHash: 'x',
			role: 'admin',
		})
		.returning()

	adminUserId = adminUser.id
	adminToken = await sign(
		{ sub: adminUserId, role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 },
		JWT_SECRET,
	)

	// Create test bot
	const [bot] = await db
		.insert(bots)
		.values({
			name: 'Doc Test Bot',
			systemPrompt: 'Test',
			userId: adminUserId,
		})
		.returning()

	testBotId = bot.id
})

afterAll(async () => {
	// Clean up test documents
	for (const id of insertedDocumentIds) {
		await db.delete(documents).where(eq(documents.id, id))
	}

	// Clean up test bot
	await db.delete(bots).where(eq(bots.id, testBotId))

	// Clean up admin user
	await db.delete(users).where(eq(users.id, adminUserId))
})

describe('Documents integration', () => {
	describe('LIST', () => {
		it('LIST-01: Returns paginated data with default params (page 1, limit 20, desc)', async () => {
			// Create 3 test documents
			for (let i = 0; i < 3; i++) {
				const [doc] = await db
					.insert(documents)
					.values({
						title: `Test Doc ${i}`,
						content: 'Test content',
						botId: testBotId,
					})
					.returning()
				insertedDocumentIds.push(doc.id)
			}

			const res = await app.request('/api/documents', {
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
			const res = await app.request('/api/documents?page=1&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.meta.page).toBe(1)
			expect(body.meta.limit).toBe(2)
			expect(body.data.length).toBeLessThanOrEqual(2)
		})

		it('LIST-03: Page 2 returns different items than page 1', async () => {
			const res1 = await app.request('/api/documents?page=1&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const body1 = await res1.json()

			const res2 = await app.request('/api/documents?page=2&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const body2 = await res2.json()

			const ids1 = body1.data.map((d: { id: string }) => d.id)
			const ids2 = body2.data.map((d: { id: string }) => d.id)

			// No overlap between pages
			for (const id of ids2) {
				expect(ids1).not.toContain(id)
			}
		})

		it('LIST-04: Page beyond total returns empty data', async () => {
			const res = await app.request('/api/documents?page=999&limit=20', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toHaveLength(0)
			expect(body.meta.hasMore).toBe(false)
		})

		it('LIST-05: Search is case-insensitive and partial match', async () => {
			const res = await app.request('/api/documents?search=test+doc', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-06: Search returns empty for no match', async () => {
			const res = await app.request('/api/documents?search=nonexistent-xyz-123', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toHaveLength(0)
			expect(body.meta.total).toBe(0)
		})

		it('LIST-07: filterValue + filterFields targets specific columns', async () => {
			const res = await app.request('/api/documents?filterValue=Test+Doc+0&filterFields=title', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-08: filterFields ignores columns not in whitelist', async () => {
			const res = await app.request('/api/documents?filterValue=test&filterFields=botId,title', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			// botId is not in sortColumns whitelist, so only title is searched
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-09: Sort ascending works for each sortColumn', async () => {
			const res = await app.request('/api/documents?sort=title&order=asc&limit=100', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			const titles = body.data.map((d: { title: string }) => d.title)
			const sorted = [...titles].sort()
			expect(titles).toEqual(sorted)
		})

		it('LIST-10: Sort descending works for each sortColumn', async () => {
			const res = await app.request('/api/documents?sort=title&order=desc&limit=100', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			const titles = body.data.map((d: { title: string }) => d.title)
			const sorted = [...titles].sort().reverse()
			expect(titles).toEqual(sorted)
		})

		it('LIST-11: Invalid sort column falls back to defaultSort', async () => {
			const res = await app.request('/api/documents?sort=invalid&order=desc', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			// Should fall back to createdAt desc (default)
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-12: Combined: search + sort + pagination', async () => {
			const res = await app.request(
				'/api/documents?search=Test&sort=title&order=asc&page=1&limit=2',
				{
					headers: { Authorization: `Bearer ${adminToken}` },
				},
			)

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.meta.page).toBe(1)
			expect(body.meta.limit).toBe(2)
			expect(body.data.length).toBeLessThanOrEqual(2)
		})
	})

	describe('GET', () => {
		it('GET-01: Returns item by ID', async () => {
			const docId = insertedDocumentIds[0]
			const res = await app.request(`/api/documents/${docId}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.id).toBe(docId)
			expect(body.title).toBeDefined()
			expect(body.content).toBeDefined()
		})

		it('GET-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/documents/00000000-0000-0000-0000-000000000000', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(404)
			const body = await res.json()
			expect(body.error.code).toBe('NOT_FOUND')
		})
	})

	describe('CREATE', () => {
		it('CREATE-01: Creates and returns item (201)', async () => {
			const res = await app.request('/api/documents', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title: 'Create Test Doc',
					content: 'This is test content',
					botId: testBotId,
				}),
			})

			expect(res.status).toBe(201)
			const body = await res.json()
			expect(body.id).toBeDefined()
			expect(body.title).toBe('Create Test Doc')
			expect(body.content).toBe('This is test content')

			insertedDocumentIds.push(body.id)
		})

		it('CREATE-02: Returns 400 for invalid payload', async () => {
			const res = await app.request('/api/documents', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title: '',
					content: '',
					botId: 'not-a-uuid',
				}),
			})

			expect(res.status).toBe(400)
			const body = await res.json()
			expect(body.success).toBe(false)
			expect(body.error.name).toBe('ZodError')
		})
	})

	describe('UPDATE', () => {
		it('UPDATE-01: Updates and returns item', async () => {
			const docId = insertedDocumentIds[0]
			const res = await app.request(`/api/documents/${docId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title: 'Updated Doc Title',
				}),
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.id).toBe(docId)
			expect(body.title).toBe('Updated Doc Title')
		})

		it('UPDATE-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/documents/00000000-0000-0000-0000-000000000000', {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title: 'Does not matter',
				}),
			})

			expect(res.status).toBe(404)
			const body = await res.json()
			expect(body.error.code).toBe('NOT_FOUND')
		})

		it('UPDATE-03: Returns 400 for invalid payload', async () => {
			const docId = insertedDocumentIds[0]
			const res = await app.request(`/api/documents/${docId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title: '',
				}),
			})

			expect(res.status).toBe(400)
			const body = await res.json()
			expect(body.success).toBe(false)
			expect(body.error.name).toBe('ZodError')
		})

		it('UPDATE-04: Partial update only changes specified fields', async () => {
			const docId = insertedDocumentIds[0]

			// Get original
			const getRes = await app.request(`/api/documents/${docId}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const original = await getRes.json()

			// Update only title
			const updateRes = await app.request(`/api/documents/${docId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title: 'Partial Update Title',
				}),
			})

			expect(updateRes.status).toBe(200)
			const updated = await updateRes.json()
			expect(updated.title).toBe('Partial Update Title')
			expect(updated.content).toBe(original.content)
			expect(updated.botId).toBe(original.botId)
		})
	})

	describe('DELETE', () => {
		it('DELETE-01: Deletes item by ID', async () => {
			// Create a document to delete
			const [doc] = await db
				.insert(documents)
				.values({
					title: 'To Delete',
					content: 'Test',
					botId: testBotId,
				})
				.returning()

			const res = await app.request(`/api/documents/${doc.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(204)

			// Verify it's gone
			const getRes = await app.request(`/api/documents/${doc.id}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			expect(getRes.status).toBe(404)
		})

		it('DELETE-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/documents/00000000-0000-0000-0000-000000000000', {
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
			// Create 2 documents to delete
			const doc1 = await db
				.insert(documents)
				.values({
					title: 'Bulk Delete 1',
					content: 'Test',
					botId: testBotId,
				})
				.returning()

			const doc2 = await db
				.insert(documents)
				.values({
					title: 'Bulk Delete 2',
					content: 'Test',
					botId: testBotId,
				})
				.returning()

			const ids = [doc1[0].id, doc2[0].id]

			const res = await app.request('/api/documents/bulk', {
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
				const getRes = await app.request(`/api/documents/${id}`, {
					headers: { Authorization: `Bearer ${adminToken}` },
				})
				expect(getRes.status).toBe(404)
			}
		})
	})
})
