/**
 * Integration tests for paginatedList() — the core query utility.
 *
 * Tests against a REAL PostgreSQL database (docker-compose).
 * Covers: pagination, search, filterValue/filterFields, sort, order.
 *
 * Uses the `users` table (no foreign keys) as the test subject.
 */
import type { ListQuery } from '@repo/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { initDb } from '../../db/client'
import { users } from '../../slices/users/schema'
import { paginatedList } from '../query-utils'

const TEST_DB_URL = 'postgresql://mvp:mvp@localhost:5433/mvp'

// Deterministic test data — names are crafted for search/sort verification
const TEST_USERS = [
	{ email: 'alice@test.local', name: 'Alice Anderson', passwordHash: 'x', role: 'admin' as const },
	{ email: 'bob@test.local', name: 'Bob Baker', passwordHash: 'x', role: 'user' as const },
	{ email: 'carol@test.local', name: 'Carol Chen', passwordHash: 'x', role: 'user' as const },
	{ email: 'david@test.local', name: 'David Diaz', passwordHash: 'x', role: 'admin' as const },
	{ email: 'eve@test.local', name: 'Eve Edwards', passwordHash: 'x', role: 'user' as const },
]

let db: ReturnType<typeof initDb>
const insertedIds: string[] = []

function defaultQuery(overrides: Partial<ListQuery> = {}): ListQuery {
	return { page: 1, limit: 20, order: 'desc' as const, ...overrides }
}

const paginatedUsers = (query: ListQuery) =>
	paginatedList(db, query, {
		table: users,
		searchColumns: [users.name, users.email],
		sortColumns: {
			name: users.name,
			email: users.email,
			role: users.role,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt,
		},
	})

beforeAll(async () => {
	db = initDb(TEST_DB_URL)

	// Clean up any leftover test data
	for (const u of TEST_USERS) {
		await db.delete(users).where(eq(users.email, u.email))
	}

	// Insert test data with small delays to ensure distinct createdAt timestamps
	for (const u of TEST_USERS) {
		const [row] = await db.insert(users).values(u).returning()
		insertedIds.push(row.id)
		// 10ms delay to guarantee timestamp ordering
		await new Promise((r) => setTimeout(r, 10))
	}
})

afterAll(async () => {
	// Clean up test data
	for (const u of TEST_USERS) {
		await db.delete(users).where(eq(users.email, u.email))
	}
})

describe('paginatedList', () => {
	// --- Pagination ---

	it('returns all items on page 1 with large limit', async () => {
		const result = await paginatedUsers(defaultQuery({ limit: 100 }))
		// At least our 5 test users (may have more from seed data)
		expect(result.data.length).toBeGreaterThanOrEqual(5)
		expect(result.meta.page).toBe(1)
		expect(result.meta.limit).toBe(100)
		expect(result.meta.total).toBeGreaterThanOrEqual(5)
	})

	it('respects limit parameter', async () => {
		const result = await paginatedUsers(defaultQuery({ limit: 2 }))
		expect(result.data.length).toBe(2)
		expect(result.meta.limit).toBe(2)
		expect(result.meta.hasMore).toBe(true)
	})

	it('returns correct page 2', async () => {
		const page1 = await paginatedUsers(defaultQuery({ limit: 2 }))
		const page2 = await paginatedUsers(defaultQuery({ page: 2, limit: 2 }))

		expect(page2.meta.page).toBe(2)
		// Pages should not overlap
		const page1Ids = page1.data.map((u) => u.id)
		const page2Ids = page2.data.map((u) => u.id)
		for (const id of page2Ids) {
			expect(page1Ids).not.toContain(id)
		}
	})

	it('calculates totalPages correctly', async () => {
		const result = await paginatedUsers(defaultQuery({ limit: 2 }))
		expect(result.meta.totalPages).toBe(Math.ceil(result.meta.total / 2))
	})

	it('returns empty data for page beyond total', async () => {
		const result = await paginatedUsers(defaultQuery({ page: 999, limit: 20 }))
		expect(result.data).toHaveLength(0)
		expect(result.meta.hasMore).toBe(false)
	})

	// --- Search ---

	it('searches across searchColumns (name match)', async () => {
		const result = await paginatedUsers(defaultQuery({ search: 'Alice' }))
		expect(result.data.length).toBe(1)
		expect(result.data[0].name).toBe('Alice Anderson')
	})

	it('searches across searchColumns (email match)', async () => {
		const result = await paginatedUsers(defaultQuery({ search: 'carol@test' }))
		expect(result.data.length).toBe(1)
		expect(result.data[0].email).toBe('carol@test.local')
	})

	it('search is case-insensitive', async () => {
		const result = await paginatedUsers(defaultQuery({ search: 'BOB' }))
		expect(result.data.length).toBe(1)
		expect(result.data[0].name).toBe('Bob Baker')
	})

	it('search returns empty for no match', async () => {
		const result = await paginatedUsers(defaultQuery({ search: 'zzzznouser' }))
		expect(result.data).toHaveLength(0)
		expect(result.meta.total).toBe(0)
	})

	it('search with partial match finds multiple', async () => {
		// "test.local" is in all test emails
		const result = await paginatedUsers(defaultQuery({ search: 'test.local' }))
		expect(result.data.length).toBeGreaterThanOrEqual(5)
	})

	// --- Targeted Filter (filterValue + filterFields) ---

	it('filters by specific column (filterFields=name)', async () => {
		const result = await paginatedUsers(
			defaultQuery({ filterValue: 'David', filterFields: 'name' }),
		)
		expect(result.data.length).toBe(1)
		expect(result.data[0].name).toBe('David Diaz')
	})

	it('filters across multiple columns (filterFields=name,email)', async () => {
		const result = await paginatedUsers(
			defaultQuery({ filterValue: 'eve', filterFields: 'name,email' }),
		)
		expect(result.data.length).toBe(1)
		expect(result.data[0].email).toBe('eve@test.local')
	})

	it('filterFields resolves against whitelist — ignores unknown columns', async () => {
		const result = await paginatedUsers(
			defaultQuery({ filterValue: 'Alice', filterFields: 'passwordHash,name' }),
		)
		// passwordHash is NOT in sortColumns whitelist, so only name is searched
		expect(result.data.length).toBe(1)
		expect(result.data[0].name).toBe('Alice Anderson')
	})

	it('filterFields with ALL unknown columns returns unfiltered results', async () => {
		const result = await paginatedUsers(
			defaultQuery({ filterValue: 'Alice', filterFields: 'passwordHash,nonexistent' }),
		)
		// No valid columns → no filter applied → returns all users
		expect(result.data.length).toBeGreaterThanOrEqual(5)
	})

	it('filterValue without filterFields uses search instead (no filter)', async () => {
		// filterValue alone, no filterFields → condition branch NOT taken
		const result = await paginatedUsers(defaultQuery({ filterValue: 'Alice' }))
		// Without filterFields, it falls through — no search condition applied
		expect(result.data.length).toBeGreaterThanOrEqual(5)
	})

	it('filter by role column', async () => {
		const result = await paginatedUsers(
			defaultQuery({ filterValue: 'admin', filterFields: 'role' }),
		)
		expect(result.data.length).toBeGreaterThanOrEqual(2)
		for (const user of result.data) {
			expect(user.role).toBe('admin')
		}
	})

	// --- Sort ---

	it('sorts by name ascending', async () => {
		const result = await paginatedUsers(defaultQuery({ sort: 'name', order: 'asc', limit: 100 }))
		const names = result.data.map((u) => u.name)
		const sorted = [...names].sort()
		expect(names).toEqual(sorted)
	})

	it('sorts by name descending', async () => {
		const result = await paginatedUsers(defaultQuery({ sort: 'name', order: 'desc', limit: 100 }))
		const names = result.data.map((u) => u.name)
		const sorted = [...names].sort().reverse()
		expect(names).toEqual(sorted)
	})

	it('sorts by email ascending', async () => {
		const result = await paginatedUsers(defaultQuery({ sort: 'email', order: 'asc', limit: 100 }))
		const emails = result.data.map((u) => u.email)
		const sorted = [...emails].sort()
		expect(emails).toEqual(sorted)
	})

	it('sorts by createdAt descending (default)', async () => {
		const result = await paginatedUsers(defaultQuery({ limit: 100 }))
		const timestamps = result.data.map((u) => u.createdAt.getTime())
		for (let i = 1; i < timestamps.length; i++) {
			expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1])
		}
	})

	it('sorts by createdAt ascending', async () => {
		const result = await paginatedUsers(
			defaultQuery({ sort: 'createdAt', order: 'asc', limit: 100 }),
		)
		const timestamps = result.data.map((u) => u.createdAt.getTime())
		for (let i = 1; i < timestamps.length; i++) {
			expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
		}
	})

	it('falls back to defaultSort for invalid sort column', async () => {
		const resultInvalid = await paginatedUsers(
			defaultQuery({ sort: 'nonexistent', order: 'desc', limit: 100 }),
		)
		const resultDefault = await paginatedUsers(defaultQuery({ order: 'desc', limit: 100 }))

		// Should produce same order (both use createdAt desc)
		expect(resultInvalid.data.map((u) => u.id)).toEqual(resultDefault.data.map((u) => u.id))
	})

	// --- Combined: search + sort + pagination ---

	it('combines search with sort', async () => {
		// Search for test.local (all test users), sort by name asc
		const result = await paginatedUsers(
			defaultQuery({ search: 'test.local', sort: 'name', order: 'asc' }),
		)
		expect(result.data.length).toBeGreaterThanOrEqual(5)
		const names = result.data.map((u) => u.name)
		const sorted = [...names].sort()
		expect(names).toEqual(sorted)
	})

	it('combines search with pagination', async () => {
		// Search test.local, limit 2 → should have more pages
		const result = await paginatedUsers(defaultQuery({ search: 'test.local', limit: 2 }))
		expect(result.data.length).toBe(2)
		expect(result.meta.total).toBeGreaterThanOrEqual(5)
		expect(result.meta.hasMore).toBe(true)
	})
})
