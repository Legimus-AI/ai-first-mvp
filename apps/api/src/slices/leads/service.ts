import { count, eq, sql, and } from 'drizzle-orm'
import { AppError, type CreateLead, type ListQuery, buildPaginationMeta } from '@repo/shared'
import type { getDb } from '../../db/client'
import { leads } from './schema'

export async function listLeads(
	db: ReturnType<typeof getDb>,
	query: ListQuery,
	botId?: string,
) {
	const offset = (query.page - 1) * query.limit

	// Build where condition
	const whereCondition = botId ? eq(leads.botId, botId) : undefined

	// Execute query with pagination
	const [items, [totalResult]] = await Promise.all([
		db
			.select()
			.from(leads)
			.where(whereCondition)
			.orderBy(
				query.order === 'asc'
					? sql`${leads[query.sort as keyof typeof leads] || leads.createdAt} ASC`
					: sql`${leads[query.sort as keyof typeof leads] || leads.createdAt} DESC`,
			)
			.offset(offset)
			.limit(query.limit),
		db
			.select({ count: count() })
			.from(leads)
			.where(whereCondition),
	])

	const sanitizedItems = items.map((lead) => ({
		...lead,
		metadata: lead.metadata as Record<string, unknown> | null,
		createdAt: lead.createdAt.toISOString(),
	}))

	return {
		data: sanitizedItems,
		meta: buildPaginationMeta(query, Number(totalResult.count)),
	}
}

export async function getLeadById(db: ReturnType<typeof getDb>, id: string) {
	const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1)

	if (!lead) {
		throw AppError.notFound('Lead not found')
	}

	return {
		...lead,
		metadata: lead.metadata as Record<string, unknown> | null,
		createdAt: lead.createdAt.toISOString(),
	}
}

export async function createLead(db: ReturnType<typeof getDb>, data: CreateLead) {
	// Check if lead already exists for this botId + senderId
	const [existing] = await db
		.select()
		.from(leads)
		.where(and(eq(leads.botId, data.botId), eq(leads.senderId, data.senderId)))
		.limit(1)

	// If exists, update it (upsert behavior)
	if (existing) {
		const [updated] = await db
			.update(leads)
			.set({
				name: data.name ?? existing.name,
				email: data.email ?? existing.email,
				phone: data.phone ?? existing.phone,
				metadata: data.metadata ?? existing.metadata,
			})
			.where(eq(leads.id, existing.id))
			.returning()

		return {
			...updated,
			createdAt: updated.createdAt.toISOString(),
		}
	}

	// Create new lead
	const [lead] = await db.insert(leads).values(data).returning()

	return {
		...lead,
		metadata: lead.metadata as Record<string, unknown> | null,
		createdAt: lead.createdAt.toISOString(),
	}
}

export async function deleteLeadsByBotId(db: ReturnType<typeof getDb>, botId: string) {
	await db.delete(leads).where(eq(leads.botId, botId))
}

export async function deleteLead(db: ReturnType<typeof getDb>, id: string) {
	const [deleted] = await db.delete(leads).where(eq(leads.id, id)).returning()

	if (!deleted) {
		throw AppError.notFound('Lead not found')
	}

	return deleted
}
