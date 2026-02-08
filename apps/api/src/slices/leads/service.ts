import { AppError, type CreateLead, type ListQuery, type UpdateLead } from '@repo/shared'
import { and, eq, inArray } from 'drizzle-orm'
import type { getDb } from '../../db/client'
import { paginatedList } from '../../lib/query-utils'
import { leads } from './schema'

export async function listLeads(db: ReturnType<typeof getDb>, query: ListQuery, botId?: string) {
	const { data, meta } = await paginatedList(db, query, {
		table: leads,
		searchColumns: [leads.name, leads.email, leads.phone, leads.senderId],
		sortColumns: {
			name: leads.name,
			email: leads.email,
			phone: leads.phone,
			senderId: leads.senderId,
			createdAt: leads.createdAt,
		},
		extraWhere: botId ? eq(leads.botId, botId) : undefined,
	})

	return {
		data: data.map((lead) => ({
			...lead,
			metadata: lead.metadata as Record<string, unknown> | null,
			createdAt: lead.createdAt.toISOString(),
		})),
		meta,
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
			metadata: updated.metadata as Record<string, unknown> | null,
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

export async function updateLead(db: ReturnType<typeof getDb>, id: string, data: UpdateLead) {
	const [existing] = await db.select().from(leads).where(eq(leads.id, id)).limit(1)

	if (!existing) {
		throw AppError.notFound('Lead not found')
	}

	// Note: leads table has no updatedAt column — just update the fields
	const [updated] = await db.update(leads).set(data).where(eq(leads.id, id)).returning()

	return {
		...updated,
		metadata: updated.metadata as Record<string, unknown> | null,
		createdAt: updated.createdAt.toISOString(),
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

export async function bulkDeleteLeads(db: ReturnType<typeof getDb>, ids: string[]) {
	await db.delete(leads).where(inArray(leads.id, ids))
	return { deleted: ids.length }
}
