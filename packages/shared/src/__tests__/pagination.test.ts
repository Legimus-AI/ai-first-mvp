import { describe, expect, it } from 'vitest'
import { buildPaginationMeta, listQuerySchema } from '../pagination'

describe('listQuerySchema', () => {
	it('applies defaults', () => {
		const result = listQuerySchema.safeParse({})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.page).toBe(1)
			expect(result.data.limit).toBe(20)
			expect(result.data.order).toBe('desc')
		}
	})

	it('coerces string numbers', () => {
		const result = listQuerySchema.safeParse({ page: '3', limit: '50' })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.page).toBe(3)
			expect(result.data.limit).toBe(50)
		}
	})

	it('rejects page < 1', () => {
		const result = listQuerySchema.safeParse({ page: 0 })
		expect(result.success).toBe(false)
	})

	it('rejects limit > 100', () => {
		const result = listQuerySchema.safeParse({ limit: 101 })
		expect(result.success).toBe(false)
	})

	it('rejects invalid order', () => {
		const result = listQuerySchema.safeParse({ order: 'random' })
		expect(result.success).toBe(false)
	})

	it('accepts optional search and sort', () => {
		const result = listQuerySchema.safeParse({ search: 'buy', sort: 'title' })
		expect(result.success).toBe(true)
	})
})

describe('buildPaginationMeta', () => {
	it('computes meta for first page', () => {
		const meta = buildPaginationMeta({ page: 1, limit: 10, order: 'desc' }, 25)
		expect(meta).toEqual({
			page: 1,
			limit: 10,
			total: 25,
			totalPages: 3,
			hasMore: true,
		})
	})

	it('computes meta for last page', () => {
		const meta = buildPaginationMeta({ page: 3, limit: 10, order: 'desc' }, 25)
		expect(meta).toEqual({
			page: 3,
			limit: 10,
			total: 25,
			totalPages: 3,
			hasMore: false,
		})
	})

	it('handles zero results', () => {
		const meta = buildPaginationMeta({ page: 1, limit: 20, order: 'desc' }, 0)
		expect(meta).toEqual({
			page: 1,
			limit: 20,
			total: 0,
			totalPages: 0,
			hasMore: false,
		})
	})

	it('handles exact page boundary', () => {
		const meta = buildPaginationMeta({ page: 2, limit: 10, order: 'desc' }, 20)
		expect(meta).toEqual({
			page: 2,
			limit: 10,
			total: 20,
			totalPages: 2,
			hasMore: false,
		})
	})
})
