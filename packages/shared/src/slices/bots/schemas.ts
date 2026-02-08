import { z } from '@hono/zod-openapi'

// --- Domain ---

export const botSchema = z
	.object({
		id: z.string().uuid().openapi({ example: '01942f1e-5b3a-7000-8000-000000000002' }),
		name: z.string().openapi({ example: 'E-commerce Assistant' }),
		systemPrompt: z.string().openapi({ example: 'You are a helpful e-commerce assistant.' }),
		model: z.string().openapi({ example: 'gemini-2.0-flash' }),
		welcomeMessage: z.string().openapi({ example: 'Hi! How can I help you today?' }),
		userId: z.string().uuid().openapi({ example: '01942f1e-5b3a-7000-8000-000000000001' }),
		isActive: z.boolean().openapi({ example: true }),
		createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
	})
	.openapi('Bot')

export type Bot = z.infer<typeof botSchema>

// --- Requests ---

export const createBotSchema = z
	.object({
		name: z.string().min(1).max(100),
		systemPrompt: z.string().min(1).max(5000),
		model: z.string().default('gemini-2.0-flash'),
		welcomeMessage: z.string().max(500).default('Hi! How can I help you today?'),
		isActive: z.boolean().default(true),
	})
	.openapi('CreateBot')

export type CreateBot = z.infer<typeof createBotSchema>

export const updateBotSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		systemPrompt: z.string().min(1).max(5000).optional(),
		model: z.string().optional(),
		welcomeMessage: z.string().max(500).optional(),
		isActive: z.boolean().optional(),
	})
	.openapi('UpdateBot')

export type UpdateBot = z.infer<typeof updateBotSchema>
