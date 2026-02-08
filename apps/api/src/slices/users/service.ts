import { AppError, type CreateUser, type ListQuery, type UpdateUser } from '@repo/shared'
import bcrypt from 'bcryptjs'
import { eq, inArray } from 'drizzle-orm'
import type { getDb } from '../../db/client'
import { paginatedList } from '../../lib/query-utils'
import { users } from './schema'

const SALT_ROUNDS = 10

export async function listUsers(db: ReturnType<typeof getDb>, query: ListQuery) {
	const { data, meta } = await paginatedList(db, query, {
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

	return {
		data: data.map(({ passwordHash, ...user }) => ({
			...user,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		})),
		meta,
	}
}

export async function getUserById(db: ReturnType<typeof getDb>, id: string) {
	const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)

	if (!user) {
		throw AppError.notFound('User not found')
	}

	const { passwordHash: _, ...userWithoutPassword } = user

	return {
		...userWithoutPassword,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	}
}

export async function createUser(db: ReturnType<typeof getDb>, data: CreateUser) {
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

	const { passwordHash: _, ...userWithoutPassword } = user

	return {
		...userWithoutPassword,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	}
}

export async function updateUser(db: ReturnType<typeof getDb>, id: string, data: UpdateUser) {
	// Check if user exists
	const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1)

	if (!existing) {
		throw AppError.notFound('User not found')
	}

	// Update user
	const [updated] = await db
		.update(users)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(users.id, id))
		.returning()

	const { passwordHash: _, ...userWithoutPassword } = updated

	return {
		...userWithoutPassword,
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
	}
}

export async function deleteUser(db: ReturnType<typeof getDb>, id: string) {
	const [deleted] = await db.delete(users).where(eq(users.id, id)).returning()

	if (!deleted) {
		throw AppError.notFound('User not found')
	}

	return deleted
}

export async function bulkDeleteUsers(db: ReturnType<typeof getDb>, ids: string[]) {
	await db.delete(users).where(inArray(users.id, ids))
	return { deleted: ids.length }
}
