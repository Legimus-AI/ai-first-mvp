import { z } from '@hono/zod-openapi'

// --- Domain ---

export const userRoleSchema = z.enum(['admin', 'user']).openapi('UserRole')
export type UserRole = z.infer<typeof userRoleSchema>

export const userSchema = z
	.object({
		id: z.string().uuid().openapi({ example: '01942f1e-5b3a-7000-8000-000000000001' }),
		email: z.string().email().openapi({ example: 'admin@example.com' }),
		name: z.string().openapi({ example: 'Admin User' }),
		role: userRoleSchema,
		createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
	})
	.openapi('User')

export type User = z.infer<typeof userSchema>

// --- Requests ---

export const createUserSchema = z
	.object({
		email: z.string().email(),
		name: z.string().min(1).max(100),
		password: z.string().min(8).max(100),
		role: userRoleSchema.default('user'),
	})
	.openapi('CreateUser')

export type CreateUser = z.infer<typeof createUserSchema>

export const updateUserSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		role: userRoleSchema.optional(),
	})
	.openapi('UpdateUser')

export type UpdateUser = z.infer<typeof updateUserSchema>

// --- Auth ---

export const loginSchema = z
	.object({
		email: z.string().email(),
		password: z.string().min(1),
	})
	.openapi('LoginRequest')

export type LoginRequest = z.infer<typeof loginSchema>

export const authResponseSchema = z
	.object({
		token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
		user: userSchema,
	})
	.openapi('AuthResponse')

export type AuthResponse = z.infer<typeof authResponseSchema>
