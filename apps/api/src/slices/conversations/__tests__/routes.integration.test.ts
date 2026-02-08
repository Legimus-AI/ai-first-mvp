import { eq } from 'drizzle-orm'
import { sign } from 'hono/jwt'
/**
 * Conversations integration tests
 * Tests LIST, GET, DELETE operations (no CREATE/UPDATE - conversations created via /api/chat)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../../app'
import { initDb } from '../../../db/client'
import { bots } from '../../bots/schema'
import { users } from '../../users/schema'
import { conversations, messages } from '../schema'

const TEST_DB_URL = 'postgresql://mvp:mvp@localhost:5433/mvp'
const JWT_SECRET = 'test-secret-key'

let db: ReturnType<typeof initDb>
let app: ReturnType<typeof createApp>
let adminToken: string
let adminUserId: string
let testBotId: string
const insertedConversationIds: string[] = []
const insertedMessageIds: string[] = []

beforeAll(async () => {
	db = initDb(TEST_DB_URL)
	app = createApp({ jwtSecret: JWT_SECRET })

	// Create admin user for testing
	const [adminUser] = await db
		.insert(users)
		.values({
			email: 'conv-test-admin@example.com',
			name: 'Conv Test Admin',
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
			name: 'Conv Test Bot',
			systemPrompt: 'Test',
			userId: adminUserId,
		})
		.returning()

	testBotId = bot.id
})

afterAll(async () => {
	// Clean up test messages
	for (const id of insertedMessageIds) {
		await db.delete(messages).where(eq(messages.id, id))
	}

	// Clean up test conversations
	for (const id of insertedConversationIds) {
		await db.delete(conversations).where(eq(conversations.id, id))
	}

	// Clean up test bot
	await db.delete(bots).where(eq(bots.id, testBotId))

	// Clean up admin user
	await db.delete(users).where(eq(users.id, adminUserId))
})

describe('Conversations integration', () => {
	describe('LIST', () => {
		it('LIST-01: Returns paginated data with default params (page 1, limit 20, desc)', async () => {
			// Create 3 test conversations
			for (let i = 0; i < 3; i++) {
				const [conv] = await db
					.insert(conversations)
					.values({
						botId: testBotId,
						senderId: `test-conv-sender-${i}`,
					})
					.returning()
				insertedConversationIds.push(conv.id)
			}

			const res = await app.request('/api/conversations', {
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
			const res = await app.request('/api/conversations?page=1&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.meta.page).toBe(1)
			expect(body.meta.limit).toBe(2)
			expect(body.data.length).toBeLessThanOrEqual(2)
		})

		it('LIST-03: Page 2 returns different items than page 1', async () => {
			const res1 = await app.request('/api/conversations?page=1&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const body1 = await res1.json()

			const res2 = await app.request('/api/conversations?page=2&limit=2', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			const body2 = await res2.json()

			const ids1 = body1.data.map((c: { id: string }) => c.id)
			const ids2 = body2.data.map((c: { id: string }) => c.id)

			// No overlap between pages
			for (const id of ids2) {
				expect(ids1).not.toContain(id)
			}
		})

		it('LIST-04: Page beyond total returns empty data', async () => {
			const res = await app.request('/api/conversations?page=999&limit=20', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toHaveLength(0)
			expect(body.meta.hasMore).toBe(false)
		})

		it('LIST-05: Search is case-insensitive and partial match', async () => {
			const res = await app.request('/api/conversations?search=test-conv-sender', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-06: Search returns empty for no match', async () => {
			const res = await app.request('/api/conversations?search=nonexistent-xyz-123', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toHaveLength(0)
			expect(body.meta.total).toBe(0)
		})

		it('LIST-07: filterValue + filterFields targets specific columns', async () => {
			const res = await app.request(
				'/api/conversations?filterValue=test-conv-sender-0&filterFields=senderId',
				{
					headers: { Authorization: `Bearer ${adminToken}` },
				},
			)

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-08: filterFields ignores columns not in whitelist', async () => {
			const res = await app.request(
				'/api/conversations?filterValue=test&filterFields=botId,senderId',
				{
					headers: { Authorization: `Bearer ${adminToken}` },
				},
			)

			expect(res.status).toBe(200)
			const body = await res.json()
			// botId is not in sortColumns whitelist, so only senderId is searched
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-09: Sort ascending works for each sortColumn', async () => {
			const res = await app.request('/api/conversations?sort=senderId&order=asc&limit=100', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			const senderIds = body.data.map((c: { senderId: string }) => c.senderId)
			const sorted = [...senderIds].sort()
			expect(senderIds).toEqual(sorted)
		})

		it('LIST-10: Sort descending works for each sortColumn', async () => {
			const res = await app.request('/api/conversations?sort=senderId&order=desc&limit=100', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			const senderIds = body.data.map((c: { senderId: string }) => c.senderId)
			const sorted = [...senderIds].sort().reverse()
			expect(senderIds).toEqual(sorted)
		})

		it('LIST-11: Invalid sort column falls back to defaultSort', async () => {
			const res = await app.request('/api/conversations?sort=invalid&order=desc', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			// Should fall back to createdAt desc (default)
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('LIST-12: Combined: search + sort + pagination', async () => {
			const res = await app.request(
				'/api/conversations?search=test&sort=senderId&order=asc&page=1&limit=2',
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
			const convId = insertedConversationIds[0]

			// Add a message to this conversation
			const [msg] = await db
				.insert(messages)
				.values({
					conversationId: convId,
					role: 'user',
					content: 'Test message',
				})
				.returning()
			insertedMessageIds.push(msg.id)

			const res = await app.request(`/api/conversations/${convId}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.id).toBe(convId)
			expect(body.senderId).toBeDefined()
			expect(body.messages).toBeInstanceOf(Array)
			expect(body.messages.length).toBeGreaterThan(0)
		})

		it('GET-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/conversations/00000000-0000-0000-0000-000000000000', {
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(404)
			const body = await res.json()
			expect(body.error.code).toBe('NOT_FOUND')
		})
	})

	describe('DELETE', () => {
		it('DELETE-01: Deletes item by ID', async () => {
			// Create a conversation to delete
			const [conv] = await db
				.insert(conversations)
				.values({
					botId: testBotId,
					senderId: 'to-delete-conv',
				})
				.returning()

			const res = await app.request(`/api/conversations/${conv.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${adminToken}` },
			})

			expect(res.status).toBe(204)

			// Verify it's gone
			const getRes = await app.request(`/api/conversations/${conv.id}`, {
				headers: { Authorization: `Bearer ${adminToken}` },
			})
			expect(getRes.status).toBe(404)
		})

		it('DELETE-02: Returns 404 for non-existent ID', async () => {
			const res = await app.request('/api/conversations/00000000-0000-0000-0000-000000000000', {
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
			// Create 2 conversations to delete
			const conv1 = await db
				.insert(conversations)
				.values({
					botId: testBotId,
					senderId: 'bulk-delete-conv-1',
				})
				.returning()

			const conv2 = await db
				.insert(conversations)
				.values({
					botId: testBotId,
					senderId: 'bulk-delete-conv-2',
				})
				.returning()

			const ids = [conv1[0].id, conv2[0].id]

			const res = await app.request('/api/conversations/bulk', {
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
				const getRes = await app.request(`/api/conversations/${id}`, {
					headers: { Authorization: `Bearer ${adminToken}` },
				})
				expect(getRes.status).toBe(404)
			}
		})
	})
})
