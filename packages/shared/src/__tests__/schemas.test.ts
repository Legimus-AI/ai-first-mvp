import { describe, expect, it } from 'vitest'
import { botSchema, createBotSchema, updateBotSchema } from '../slices/bots/schemas'
import { userSchema, createUserSchema, loginSchema } from '../slices/users/schemas'
import { chatRequestSchema, chatResponseSchema } from '../slices/conversations/schemas'
import { leadSchema, createLeadSchema } from '../slices/leads/schemas'
import { documentSchema, createDocumentSchema } from '../slices/documents/schemas'

describe('userSchema', () => {
	const validUser = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		email: 'admin@example.com',
		name: 'Admin User',
		role: 'admin' as const,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	}

	it('accepts a valid user', () => {
		const result = userSchema.safeParse(validUser)
		expect(result.success).toBe(true)
	})

	it('rejects invalid role', () => {
		const result = userSchema.safeParse({ ...validUser, role: 'superadmin' })
		expect(result.success).toBe(false)
	})

	it('rejects invalid email', () => {
		const result = userSchema.safeParse({ ...validUser, email: 'not-email' })
		expect(result.success).toBe(false)
	})
})

describe('createUserSchema', () => {
	it('accepts valid input', () => {
		const result = createUserSchema.safeParse({
			email: 'test@example.com',
			name: 'Test',
			password: 'password123',
		})
		expect(result.success).toBe(true)
	})

	it('rejects short password', () => {
		const result = createUserSchema.safeParse({
			email: 'test@example.com',
			name: 'Test',
			password: '123',
		})
		expect(result.success).toBe(false)
	})
})

describe('loginSchema', () => {
	it('accepts valid login', () => {
		const result = loginSchema.safeParse({
			email: 'test@example.com',
			password: 'password123',
		})
		expect(result.success).toBe(true)
	})
})

describe('botSchema', () => {
	const validBot = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		name: 'E-commerce Bot',
		systemPrompt: 'You are a helpful assistant.',
		model: 'gemini-2.0-flash',
		welcomeMessage: 'Hi!',
		userId: '550e8400-e29b-41d4-a716-446655440001',
		isActive: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	}

	it('accepts a valid bot', () => {
		const result = botSchema.safeParse(validBot)
		expect(result.success).toBe(true)
	})
})

describe('createBotSchema', () => {
	it('accepts valid input with defaults', () => {
		const result = createBotSchema.safeParse({
			name: 'My Bot',
			systemPrompt: 'You are helpful.',
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.model).toBe('gemini-2.0-flash')
			expect(result.data.isActive).toBe(true)
		}
	})
})

describe('chatRequestSchema', () => {
	it('accepts valid chat request', () => {
		const result = chatRequestSchema.safeParse({
			senderId: 'visitor-123',
			message: 'Hello!',
		})
		expect(result.success).toBe(true)
	})

	it('rejects empty message', () => {
		const result = chatRequestSchema.safeParse({
			senderId: 'visitor-123',
			message: '',
		})
		expect(result.success).toBe(false)
	})
})

describe('chatResponseSchema', () => {
	it('accepts valid chat response', () => {
		const result = chatResponseSchema.safeParse({
			reply: 'Here is the answer...',
			conversationId: '550e8400-e29b-41d4-a716-446655440000',
		})
		expect(result.success).toBe(true)
	})
})

describe('leadSchema', () => {
	it('accepts lead with nullable fields', () => {
		const result = leadSchema.safeParse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			botId: '550e8400-e29b-41d4-a716-446655440001',
			senderId: 'visitor-123',
			name: null,
			email: null,
			phone: null,
			metadata: null,
			createdAt: '2026-01-01T00:00:00.000Z',
		})
		expect(result.success).toBe(true)
	})
})

describe('documentSchema', () => {
	it('accepts valid document', () => {
		const result = documentSchema.safeParse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			botId: '550e8400-e29b-41d4-a716-446655440001',
			title: 'Return Policy',
			content: 'Returns accepted within 30 days.',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		})
		expect(result.success).toBe(true)
	})
})
