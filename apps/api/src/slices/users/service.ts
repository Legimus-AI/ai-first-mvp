import { AppError, type ListQuery, type UpdateUser } from '@repo/shared'
import { eq } from 'drizzle-orm'
import type { getDb } from '../../db/client'
import { paginatedList } from '../../lib/query-utils'
import { users } from './schema'

export async function listUsers(db: ReturnType<typeof getDb>, query: ListQuery) {
	const { data, meta } = await paginatedList(db, query, {
		table: users,
		searchColumns: [users.name, users.email],
		sortColumns: { name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt },
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
