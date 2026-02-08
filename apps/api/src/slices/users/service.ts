import { AppError, type ListQuery, type UpdateUser, buildPaginationMeta } from '@repo/shared'
import { count, eq, ilike, or, sql } from 'drizzle-orm'
import type { getDb } from '../../db/client'
import { users } from './schema'

export async function listUsers(db: ReturnType<typeof getDb>, query: ListQuery) {
	const offset = (query.page - 1) * query.limit

	// Build search condition
	const searchCondition = query.search
		? or(ilike(users.name, `%${query.search}%`), ilike(users.email, `%${query.search}%`))
		: undefined

	// Execute query with pagination
	const [items, [totalResult]] = await Promise.all([
		db
			.select()
			.from(users)
			.where(searchCondition)
			.orderBy(
				query.order === 'asc'
					? sql`${users[query.sort as keyof typeof users] || users.createdAt} ASC`
					: sql`${users[query.sort as keyof typeof users] || users.createdAt} DESC`,
			)
			.offset(offset)
			.limit(query.limit),
		db.select({ count: count() }).from(users).where(searchCondition),
	])

	// Remove password hashes from all users
	const sanitizedItems = items.map(({ passwordHash, ...user }) => ({
		...user,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	}))

	return {
		data: sanitizedItems,
		meta: buildPaginationMeta(query, Number(totalResult.count)),
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
