import { count, eq, ilike, sql } from 'drizzle-orm'
import {
	AppError,
	type CreateBot,
	type ListQuery,
	type UpdateBot,
	buildPaginationMeta,
} from '@repo/shared'
import type { getDb } from '../../db/client'
import { bots } from './schema'

export async function listBots(db: ReturnType<typeof getDb>, query: ListQuery) {
	const offset = (query.page - 1) * query.limit

	// Build search condition
	const searchCondition = query.search ? ilike(bots.name, `%${query.search}%`) : undefined

	// Execute query with pagination
	const [items, [totalResult]] = await Promise.all([
		db
			.select()
			.from(bots)
			.where(searchCondition)
			.orderBy(
				query.order === 'asc'
					? sql`${bots[query.sort as keyof typeof bots] || bots.createdAt} ASC`
					: sql`${bots[query.sort as keyof typeof bots] || bots.createdAt} DESC`,
			)
			.offset(offset)
			.limit(query.limit),
		db
			.select({ count: count() })
			.from(bots)
			.where(searchCondition),
	])

	const sanitizedItems = items.map((bot) => ({
		...bot,
		createdAt: bot.createdAt.toISOString(),
		updatedAt: bot.updatedAt.toISOString(),
	}))

	return {
		data: sanitizedItems,
		meta: buildPaginationMeta(query, Number(totalResult.count)),
	}
}

export async function getBotById(db: ReturnType<typeof getDb>, id: string) {
	const [bot] = await db.select().from(bots).where(eq(bots.id, id)).limit(1)

	if (!bot) {
		throw AppError.notFound('Bot not found')
	}

	return {
		...bot,
		createdAt: bot.createdAt.toISOString(),
		updatedAt: bot.updatedAt.toISOString(),
	}
}

export async function createBot(
	db: ReturnType<typeof getDb>,
	data: CreateBot,
	userId: string,
) {
	const [bot] = await db
		.insert(bots)
		.values({
			...data,
			userId,
		})
		.returning()

	return {
		...bot,
		createdAt: bot.createdAt.toISOString(),
		updatedAt: bot.updatedAt.toISOString(),
	}
}

export async function updateBot(db: ReturnType<typeof getDb>, id: string, data: UpdateBot) {
	// Check if bot exists
	const [existing] = await db.select().from(bots).where(eq(bots.id, id)).limit(1)

	if (!existing) {
		throw AppError.notFound('Bot not found')
	}

	// Update bot
	const [updated] = await db
		.update(bots)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(bots.id, id))
		.returning()

	return {
		...updated,
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
	}
}

export async function deleteBot(db: ReturnType<typeof getDb>, id: string) {
	const [deleted] = await db.delete(bots).where(eq(bots.id, id)).returning()

	if (!deleted) {
		throw AppError.notFound('Bot not found')
	}

	return deleted
}
