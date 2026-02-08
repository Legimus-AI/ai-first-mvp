import { AppError, type CreateUser } from '@repo/shared'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { sign } from 'hono/jwt'
import type { getDb } from '../../db/client'
import { users } from '../users/schema'

const SALT_ROUNDS = 10

export async function register(db: ReturnType<typeof getDb>, data: CreateUser) {
	// Check if user already exists
	const [existing] = await db.select().from(users).where(eq(users.email, data.email)).limit(1)

	if (existing) {
		throw AppError.conflict('User with this email already exists')
	}

	// Hash password
	const passwordHash = bcrypt.hashSync(data.password, SALT_ROUNDS)

	// Create user
	const [user] = await db
		.insert(users)
		.values({
			email: data.email,
			name: data.name,
			passwordHash,
			role: data.role || 'user',
		})
		.returning()

	// Return user without password hash
	const { passwordHash: _, ...userWithoutPassword } = user
	return userWithoutPassword
}

export async function login(db: ReturnType<typeof getDb>, email: string, password: string) {
	// Find user
	const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

	if (!user) {
		throw AppError.unauthorized('Invalid email or password')
	}

	// Verify password
	const isValid = bcrypt.compareSync(password, user.passwordHash)
	if (!isValid) {
		throw AppError.unauthorized('Invalid email or password')
	}

	// Return user without password hash
	const { passwordHash: _, ...userWithoutPassword } = user
	return userWithoutPassword
}

export async function generateToken(
	user: { id: string; email: string; role: string },
	secret: string,
): Promise<string> {
	const payload = {
		sub: user.id,
		email: user.email,
		role: user.role,
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
	}

	return await sign(payload, secret)
}
