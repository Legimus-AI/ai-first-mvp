import { z } from '@hono/zod-openapi'

// --- Domain ---

export const leadSchema = z
	.object({
		id: z.string().uuid().openapi({ example: '01942f1e-5b3a-7000-8000-000000000004' }),
		botId: z.string().uuid().openapi({ example: '01942f1e-5b3a-7000-8000-000000000002' }),
		senderId: z.string().openapi({ example: 'visitor-abc123' }),
		name: z.string().nullable().openapi({ example: 'John Doe' }),
		email: z.string().email().nullable().openapi({ example: 'john@example.com' }),
		phone: z.string().nullable().openapi({ example: '+56912345678' }),
		metadata: z
			.record(z.unknown())
			.nullable()
			.openapi({ example: { source: 'widget' } }),
		createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
	})
	.openapi('Lead')

export type Lead = z.infer<typeof leadSchema>

// --- Requests ---

export const createLeadSchema = z
	.object({
		botId: z.string().uuid(),
		senderId: z.string().min(1),
		name: z.string().max(100).nullable().optional(),
		email: z.string().email().nullable().optional(),
		phone: z.string().max(20).nullable().optional(),
		metadata: z.record(z.unknown()).nullable().optional(),
	})
	.openapi('CreateLead')

export type CreateLead = z.infer<typeof createLeadSchema>

export const updateLeadSchema = z
	.object({
		name: z.string().max(100).nullable().optional(),
		email: z.string().email().nullable().optional(),
		phone: z.string().max(20).nullable().optional(),
		metadata: z.record(z.unknown()).nullable().optional(),
	})
	.openapi('UpdateLead')

export type UpdateLead = z.infer<typeof updateLeadSchema>
