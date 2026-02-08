import { AppError, type CreateBot, type ListQuery, type UpdateBot } from '@repo/shared'
import { eq, inArray } from 'drizzle-orm'
import type { getDb } from '../../db/client'
import { paginatedList } from '../../lib/query-utils'
import { bots } from './schema'

export async function listBots(db: ReturnType<typeof getDb>, query: ListQuery) {
	const { data, meta } = await paginatedList(db, query, {
		table: bots,
		searchColumns: [bots.name],
		sortColumns: { name: bots.name, createdAt: bots.createdAt, updatedAt: bots.updatedAt },
	})

	return {
		data: data.map((bot) => ({
			...bot,
			createdAt: bot.createdAt.toISOString(),
			updatedAt: bot.updatedAt.toISOString(),
		})),
		meta,
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

export async function createBot(db: ReturnType<typeof getDb>, data: CreateBot, userId: string) {
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

export async function bulkDeleteBots(db: ReturnType<typeof getDb>, ids: string[]) {
	await db.delete(bots).where(inArray(bots.id, ids))
	return { deleted: ids.length }
}
