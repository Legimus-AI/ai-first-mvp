import { z } from '@hono/zod-openapi'

// --- List query schema (reusable across all slices) ---

export const listQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
		limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
		search: z.string().optional().openapi({ example: 'groceries' }),
		sort: z.string().optional().openapi({ example: 'createdAt' }),
		order: z.enum(['asc', 'desc']).default('desc').openapi({ example: 'desc' }),
	})
	.openapi('ListQuery')

export type ListQuery = z.infer<typeof listQuerySchema>

// --- Paginated response meta ---

export const paginationMetaSchema = z
	.object({
		page: z.number().openapi({ example: 1 }),
		limit: z.number().openapi({ example: 20 }),
		total: z.number().openapi({ example: 42 }),
		totalPages: z.number().openapi({ example: 3 }),
		hasMore: z.boolean().openapi({ example: true }),
	})
	.openapi('PaginationMeta')

export type PaginationMeta = z.infer<typeof paginationMetaSchema>

// --- Helper to build meta from query + total count ---

export function buildPaginationMeta(query: ListQuery, total: number): PaginationMeta {
	const totalPages = Math.ceil(total / query.limit)
	return {
		page: query.page,
		limit: query.limit,
		total,
		totalPages,
		hasMore: query.page < totalPages,
	}
}
