import { z } from '@hono/zod-openapi'

// --- Domain ---

export const documentSchema = z
	.object({
		id: z.string().uuid().openapi({ example: '01942f1e-5b3a-7000-8000-000000000003' }),
		botId: z.string().uuid().openapi({ example: '01942f1e-5b3a-7000-8000-000000000002' }),
		title: z.string().openapi({ example: 'Return Policy' }),
		content: z.string().openapi({ example: 'Our return policy allows returns within 30 days...' }),
		createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
	})
	.openapi('Document')

export type Document = z.infer<typeof documentSchema>

// --- Requests ---

export const createDocumentSchema = z
	.object({
		botId: z.string().uuid(),
		title: z.string().min(1).max(200),
		content: z.string().min(1).max(50000),
	})
	.openapi('CreateDocument')

export type CreateDocument = z.infer<typeof createDocumentSchema>

export const updateDocumentSchema = z
	.object({
		title: z.string().min(1).max(200).optional(),
		content: z.string().min(1).max(50000).optional(),
	})
	.openapi('UpdateDocument')

export type UpdateDocument = z.infer<typeof updateDocumentSchema>
