import {
	AppError,
	type CreateDocument,
	type ListQuery,
	type UpdateDocument,
} from '@repo/shared'
import { eq, inArray } from 'drizzle-orm'
import type { getDb } from '../../db/client'
import { paginatedList } from '../../lib/query-utils'
import { documents } from './schema'

export async function listDocuments(
	db: ReturnType<typeof getDb>,
	botId: string | undefined,
	query: ListQuery,
) {
	const { data, meta } = await paginatedList(db, query, {
		table: documents,
		searchColumns: [documents.title],
		sortColumns: { title: documents.title, createdAt: documents.createdAt, updatedAt: documents.updatedAt },
		extraWhere: botId ? eq(documents.botId, botId) : undefined,
	})

	return {
		data: data.map((doc) => ({
			...doc,
			createdAt: doc.createdAt.toISOString(),
			updatedAt: doc.updatedAt.toISOString(),
		})),
		meta,
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

export async function bulkDeleteDocuments(db: ReturnType<typeof getDb>, ids: string[]) {
	await db.delete(documents).where(inArray(documents.id, ids))
	return { deleted: ids.length }
}
