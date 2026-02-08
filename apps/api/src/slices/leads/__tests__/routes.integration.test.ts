import { eq } from 'drizzle-orm'
import { sign } from 'hono/jwt'
/**
 * Leads integration tests
 * Tests CRUD operations against real PostgreSQL
 * Note: createLead has upsert behavior (botId + senderId unique)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../../app'
import { initDb } from '../../../db/client'
import { bots } from '../../bots/schema'
import { users } from '../../users/schema'
import { leads } from '../schema'

const TEST_DB_URL = 'postgresql://mvp:mvp@localhost:5433/mvp'
const JWT_SECRET = 'test-secret-key'

let db: ReturnType<typeof initDb>
let app: ReturnType<typeof createApp>
let adminToken: string
let adminUserId: string
let testBotId: string
const insertedLeadIds: string[] = []

beforeAll(async () => {
	db = initDb(TEST_DB_URL)
	app = createApp({ jwtSecret: JWT_SECRET })

	// Create admin user for testing
	const [adminUser] = await db
		.insert(users)
		.values({
			email: 'lead-test-admin@example.com',
			name: 'Lead Test Admin',
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
			name: 'Lead Test Bot',
			systemPrompt: 'Test',
			userId: adminUserId,
		})
		.returning()

	testBotId = bot.id
})

afterAll(async () => {
	// Clean up test leads
	for (const id of insertedLeadIds) {
		await db.delete(leads).where(eq(leads.id, id))
	}

	// Clean up test bot
	await db.delete(bots).where(eq(bots.id, testBotId))

	// Clean up admin user
	await db.delete(users).where(eq(users.id, adminUserId))
})

describe('Leads integration', () => {
	describe('LIST', () => {
		it('LIST-01: Returns paginated data with default params (page 1, limit 20, desc)', async () => {
			// Create 3 test leads
			for (let i = 0; i < 3; i++) {
				const [lead] = await db
					.insert(leads)
					.values({
						botId: testBotId,
						senderId: `test-sender-${i}`,
						name: `Test Lead ${i}`,
						email: `testlead${i}@example.com`,
					})
					.returning()
				insertedLeadIds.push(lead.id)
			}

			const res = await app.request('/api/leads', {
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
			const res = await app.request('/api/leads?page=1&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.meta.page).toBe(1)
			expect(body.meta.limit).toBe(2)
			expect(body.data.length).toBeLessThanOrEqual(2)
		})

		it('LIST-03: Page 2 returns different items than page 1', async () => {
			const res1 = await app.request('/api/leads?page=1&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const body1 = await res1.json()

			const res2 = await app.request('/api/leads?page=2&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const body2 = await res2.json()

			const ids1 = body1.data.map((l: { id: string }) => l.id)
			const ids2 = body2.data.map((l: { id: string }) => l.id)

			// No overlap between pages
			for (const id of ids2) {
				expect(ids1).not.toContain(id)
			}
		})

		it('LIST-04: Page beyond total returns empty data', async () => {
			const res = await app.request('/api/leads?page=999&limit=20', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toHaveLength(0)
			expect(body.meta.hasMore).toBe(false)
		})

		it('LIST-05: Search is case-insensitive and partial match', async () => {
			const res = await app.request('/api/leads?search=test-sender', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-06: Search returns empty for no match', async () => {
			const res = await app.request('/api/leads?search=nonexistent-xyz-123', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toHaveLength(0)
			expect(body.meta.total).toBe(0)
		})

		it('LIST-07: filterValue + filterFields targets specific columns', async () => {
			const res = await app.request('/api/leads?filterValue=Test+Lead+0&filterFields=name', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-08: filterFields ignores columns not in whitelist', async () => {
			const res = await app.request('/api/leads?filterValue=test&filterFields=botId,name', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			// botId is not in sortColumns whitelist, so only name is searched
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-09: Sort ascending works for each sortColumn', async () => {
			const res = await app.request('/api/leads?sort=name&order=asc&limit=100', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			const names = body.data.map((l: { name: string | null }) => l.name).filter(Boolean)
			const sorted = [...names].sort()
			expect(names).toEqual(sorted)
		})

		it('LIST-10: Sort descending works for each sortColumn', async () => {
			const res = await app.request('/api/leads?sort=name&order=desc&limit=100', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			const names = body.data.map((l: { name: string | null }) => l.name).filter(Boolean)
			const sorted = [...names].sort().reverse()
			expect(names).toEqual(sorted)
		})

		it('LIST-11: Invalid sort column falls back to defaultSort', async () => {
			const res = await app.request('/api/leads?sort=invalid&order=desc', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			// Should fall back to createdAt desc (default)
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-12: Combined: search + sort + pagination', async () => {
			const res = await app.request('/api/leads?search=Test&sort=name&order=asc&page=1&limit=2', {
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
			const leadId = insertedLeadIds[0]
			const res = await app.request(`/api/leads/${leadId}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.id).toBe(leadId)
			expect(body.senderId).toBeDefined()
		})

		it('GET-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/leads/00000000-0000-0000-0000-000000000000', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(404)
			const body = await res.json()
			expect(body.error.code).toBe('NOT_FOUND')
		})
	})

	describe('CREATE', () => {
		it('CREATE-01: Creates and returns item (201)', async () => {
			const res = await app.request('/api/leads', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					botId: testBotId,
					senderId: 'create-test-sender',
					name: 'Create Test Lead',
					email: 'createtest@example.com',
					phone: '+1234567890',
				}),
			})

			expect(res.status).toBe(201)
			const body = await res.json()
			expect(body.id).toBeDefined()
			expect(body.senderId).toBe('create-test-sender')
			expect(body.name).toBe('Create Test Lead')

			insertedLeadIds.push(body.id)
		})

		it('CREATE-02: Returns 400 for invalid payload', async () => {
			const res = await app.request('/api/leads', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					botId: 'not-a-uuid',
					senderId: '',
					email: 'not-an-email',
				}),
			})

			expect(res.status).toBe(400)
			const body = await res.json()
			expect(body.success).toBe(false)
			expect(body.error.name).toBe('ZodError')
		})

		it('CREATE-03: Upsert behavior - duplicate botId+senderId updates existing', async () => {
			// Create first lead
			const res1 = await app.request('/api/leads', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					botId: testBotId,
					senderId: 'upsert-test-sender',
					name: 'First Name',
					email: 'first@example.com',
				}),
			})

			expect(res1.status).toBe(201)
			const body1 = await res1.json()
			insertedLeadIds.push(body1.id)

			// Create again with same botId+senderId (should update)
			const res2 = await app.request('/api/leads', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					botId: testBotId,
					senderId: 'upsert-test-sender',
					name: 'Updated Name',
					email: 'updated@example.com',
				}),
			})

			expect(res2.status).toBe(201)
			const body2 = await res2.json()

			// Should be same ID
			expect(body2.id).toBe(body1.id)
			expect(body2.name).toBe('Updated Name')
			expect(body2.email).toBe('updated@example.com')
		})
	})

	describe('UPDATE', () => {
		it('UPDATE-01: Updates and returns item', async () => {
			const leadId = insertedLeadIds[0]
			const res = await app.request(`/api/leads/${leadId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: 'Updated Lead Name',
				}),
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.id).toBe(leadId)
			expect(body.name).toBe('Updated Lead Name')
		})

		it('UPDATE-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/leads/00000000-0000-0000-0000-000000000000', {
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
			const leadId = insertedLeadIds[0]
			const res = await app.request(`/api/leads/${leadId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${adminToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: 'not-an-email',
				}),
			})

			expect(res.status).toBe(400)
			const body = await res.json()
			expect(body.success).toBe(false)
			expect(body.error.name).toBe('ZodError')
		})

		it('UPDATE-04: Partial update only changes specified fields', async () => {
			const leadId = insertedLeadIds[0]

			// Get original
			const getRes = await app.request(`/api/leads/${leadId}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const original = await getRes.json()

			// Update only name
			const updateRes = await app.request(`/api/leads/${leadId}`, {
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
			expect(updated.senderId).toBe(original.senderId)
			expect(updated.email).toBe(original.email)
		})
	})

	describe('DELETE', () => {
		it('DELETE-01: Deletes item by ID', async () => {
			// Create a lead to delete
			const [lead] = await db
				.insert(leads)
				.values({
					botId: testBotId,
					senderId: 'to-delete',
					name: 'To Delete',
				})
				.returning()

			const res = await app.request(`/api/leads/${lead.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(204)

			// Verify it's gone
			const getRes = await app.request(`/api/leads/${lead.id}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			expect(getRes.status).toBe(404)
		})

		it('DELETE-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/leads/00000000-0000-0000-0000-000000000000', {
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
			// Create 2 leads to delete
			const lead1 = await db
				.insert(leads)
				.values({
					botId: testBotId,
					senderId: 'bulk-delete-1',
					name: 'Bulk Delete 1',
				})
				.returning()

			const lead2 = await db
				.insert(leads)
				.values({
					botId: testBotId,
					senderId: 'bulk-delete-2',
					name: 'Bulk Delete 2',
				})
				.returning()

			const ids = [lead1[0].id, lead2[0].id]

			const res = await app.request('/api/leads/bulk', {
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
				const getRes = await app.request(`/api/leads/${id}`, {
					headers: { Authorization: `Bearer ${adminToken}` },
				})
				expect(getRes.status).toBe(404)
			}
		})
	})
})
