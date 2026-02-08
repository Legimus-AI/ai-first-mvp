import {
	AppError,
	type CreateDocument,
	type ListQuery,
	type UpdateDocument,
	buildPaginationMeta,
} from '@repo/shared'
import { count, eq, ilike, sql } from 'drizzle-orm'
import type { getDb } from '../../db/client'
import { documents } from './schema'

export async function listDocuments(
	db: ReturnType<typeof getDb>,
	botId: string | undefined,
	query: ListQuery,
) {
	const offset = (query.page - 1) * query.limit

	// Build where conditions
	const conditions = []
	if (botId) {
		conditions.push(eq(documents.botId, botId))
	}
	if (query.search) {
		conditions.push(ilike(documents.title, `%${query.search}%`))
	}

	const whereCondition =
		conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined

	// Execute query with pagination
	const [items, [totalResult]] = await Promise.all([
		db
			.select()
			.from(documents)
			.where(whereCondition)
			.orderBy(
				query.order === 'asc'
					? sql`${documents[query.sort as keyof typeof documents] || documents.createdAt} ASC`
					: sql`${documents[query.sort as keyof typeof documents] || documents.createdAt} DESC`,
			)
			.offset(offset)
			.limit(query.limit),
		db.select({ count: count() }).from(documents).where(whereCondition),
	])

	const sanitizedItems = items.map((doc) => ({
		...doc,
		createdAt: doc.createdAt.toISOString(),
		updatedAt: doc.updatedAt.toISOString(),
	}))

	return {
		data: sanitizedItems,
		meta: buildPaginationMeta(query, Number(totalResult.count)),
	}
}

export async function getDocumentById(db: ReturnType<typeof getDb>, id: string) {
	const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1)

	if (!document) {
		throw AppError.notFound('Document not found')
	}

	return {
		...document,
		createdAt: document.createdAt.toISOString(),
		updatedAt: document.updatedAt.toISOString(),
	}
}

export async function createDocument(db: ReturnType<typeof getDb>, data: CreateDocument) {
	const [document] = await db.insert(documents).values(data).returning()

	return {
		...document,
		createdAt: document.createdAt.toISOString(),
		updatedAt: document.updatedAt.toISOString(),
	}
}

export async function updateDocument(
	db: ReturnType<typeof getDb>,
	id: string,
	data: UpdateDocument,
) {
	// Check if document exists
	const [existing] = await db.select().from(documents).where(eq(documents.id, id)).limit(1)

	if (!existing) {
		throw AppError.notFound('Document not found')
	}

	// Update document
	const [updated] = await db
		.update(documents)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(documents.id, id))
		.returning()

	return {
		...updated,
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
	}
}

export async function deleteDocument(db: ReturnType<typeof getDb>, id: string) {
	const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning()

	if (!deleted) {
		throw AppError.notFound('Document not found')
	}

	return deleted
}

export async function getDocumentsByBotId(db: ReturnType<typeof getDb>, botId: string) {
	const docs = await db.select().from(documents).where(eq(documents.botId, botId))

	return docs.map((doc) => `# ${doc.title}\n\n${doc.content}`)
}
