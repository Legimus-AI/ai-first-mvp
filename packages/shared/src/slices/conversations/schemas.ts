import { z } from '@hono/zod-openapi'

// --- Domain ---

export const messageRoleSchema = z.enum(['user', 'assistant', 'system']).openapi('MessageRole')

export const messageSchema = z
	.object({
		id: z.string().uuid().openapi({ example: '01942f1e-5b3a-7000-8000-000000000006' }),
		conversationId: z.string().uuid(),
		role: messageRoleSchema,
		content: z.string().openapi({ example: 'Hello, I need help with my order' }),
		createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
	})
	.openapi('Message')

export type Message = z.infer<typeof messageSchema>

export const conversationSchema = z
	.object({
		id: z.string().uuid().openapi({ example: '01942f1e-5b3a-7000-8000-000000000005' }),
		botId: z.string().uuid(),
		senderId: z.string().openapi({ example: 'visitor-abc123' }),
		title: z.string().nullable().openapi({ example: 'Order inquiry' }),
		createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
	})
	.openapi('Conversation')

export type Conversation = z.infer<typeof conversationSchema>

// --- Chat request/response (public widget endpoint) ---

export const chatRequestSchema = z
	.object({
		senderId: z.string().min(1).openapi({ example: 'visitor-abc123' }),
		message: z.string().min(1).max(5000).openapi({ example: 'What is your return policy?' }),
	})
	.openapi('ChatRequest')

export type ChatRequest = z.infer<typeof chatRequestSchema>

export const chatResponseSchema = z
	.object({
		reply: z.string().openapi({ example: 'Our return policy allows returns within 30 days...' }),
		conversationId: z.string().uuid(),
	})
	.openapi('ChatResponse')

export type ChatResponse = z.infer<typeof chatResponseSchema>

// --- Conversation with messages ---

export const conversationWithMessagesSchema = conversationSchema
	.extend({
		messages: z.array(messageSchema),
	})
	.openapi('ConversationWithMessages')

export type ConversationWithMessages = z.infer<typeof conversationWithMessagesSchema>
