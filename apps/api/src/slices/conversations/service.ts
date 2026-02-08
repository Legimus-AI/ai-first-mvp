import { AppError, type ListQuery, buildPaginationMeta } from '@repo/shared'
import { and, count, eq, sql } from 'drizzle-orm'
import type { getDb } from '../../db/client'
import { generateChatResponse } from '../../lib/gemini'
import { getCachedMessages, setCachedMessages } from '../../lib/redis'
import { getDocumentsByBotId } from '../documents/service'
import { conversations, messages } from './schema'

const MAX_CACHED_MESSAGES = 20

export async function chat(
	db: ReturnType<typeof getDb>,
	botId: string,
	senderId: string,
	message: string,
) {
	// 1. Find or create conversation
	const [existingConv] = await db
		.select()
		.from(conversations)
		.where(and(eq(conversations.botId, botId), eq(conversations.senderId, senderId)))
		.limit(1)

	let conversation = existingConv
	if (!conversation) {
		const [newConv] = await db
			.insert(conversations)
			.values({
				botId,
				senderId,
				title: message.substring(0, 50),
			})
			.returning()
		conversation = newConv
	}

	// 2. Get cached messages or fall back to DB
	let history = await getCachedMessages(conversation.id)
	if (!history) {
		const { asc } = await import('drizzle-orm')
		const dbMessages = await db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversation.id))
			.orderBy(asc(messages.createdAt))
			.limit(MAX_CACHED_MESSAGES)

		history = dbMessages.map((msg) => ({
			role: msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'model' : 'system',
			content: msg.content,
		}))
	}

	// 3. Get bot config
	const { bots } = await import('../bots/schema')
	const [bot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1)

	if (!bot) {
		throw AppError.notFound('Bot not found')
	}

	if (!bot.isActive) {
		throw AppError.forbidden('Bot is not active')
	}

	// 4. Get bot documents for context
	const documents = await getDocumentsByBotId(db, botId)

	// 5. Format history for Gemini (history is now guaranteed to be non-null)
	const geminiHistory = (history || []).map((msg) => ({
		role: msg.role as 'user' | 'model',
		parts: [{ text: msg.content }],
	}))

	// 6. Call Gemini
	const reply = await generateChatResponse({
		systemPrompt: bot.systemPrompt,
		documents,
		history: geminiHistory,
		userMessage: message,
		model: bot.model,
	})

	// 7. Save user message and AI response
	await db.insert(messages).values([
		{
			conversationId: conversation.id,
			role: 'user',
			content: message,
		},
		{
			conversationId: conversation.id,
			role: 'assistant',
			content: reply,
		},
	])

	// 8. Update cache with last N messages
	const updatedHistory = [
		...(history || []),
		{ role: 'user', content: message },
		{ role: 'model', content: reply },
	].slice(-MAX_CACHED_MESSAGES)

	await setCachedMessages(conversation.id, updatedHistory)

	// 9. Update conversation timestamp
	await db
		.update(conversations)
		.set({ updatedAt: new Date() })
		.where(eq(conversations.id, conversation.id))

	return {
		reply,
		conversationId: conversation.id,
	}
}

export async function listConversations(
	db: ReturnType<typeof getDb>,
	query: ListQuery,
	botId?: string,
) {
	const offset = (query.page - 1) * query.limit

	const whereCondition = botId ? eq(conversations.botId, botId) : undefined

	const [items, [totalResult]] = await Promise.all([
		db
			.select()
			.from(conversations)
			.where(whereCondition)
			.orderBy(
				query.order === 'asc'
					? sql`${conversations[query.sort as keyof typeof conversations] || conversations.createdAt} ASC`
					: sql`${conversations[query.sort as keyof typeof conversations] || conversations.createdAt} DESC`,
			)
			.offset(offset)
			.limit(query.limit),
		db.select({ count: count() }).from(conversations).where(whereCondition),
	])

	const sanitizedItems = items.map((conv) => ({
		...conv,
		createdAt: conv.createdAt.toISOString(),
		updatedAt: conv.updatedAt.toISOString(),
	}))

	return {
		data: sanitizedItems,
		meta: buildPaginationMeta(query, Number(totalResult.count)),
	}
}

export async function getConversationWithMessages(db: ReturnType<typeof getDb>, id: string) {
	const [conversation] = await db
		.select()
		.from(conversations)
		.where(eq(conversations.id, id))
		.limit(1)

	if (!conversation) {
		throw AppError.notFound('Conversation not found')
	}

	const { asc } = await import('drizzle-orm')
	const conversationMessages = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, id))
		.orderBy(asc(messages.createdAt))

	return {
		...conversation,
		createdAt: conversation.createdAt.toISOString(),
		updatedAt: conversation.updatedAt.toISOString(),
		messages: conversationMessages.map((msg) => ({
			...msg,
			createdAt: msg.createdAt.toISOString(),
		})),
	}
}

export async function getConversationHistory(
	db: ReturnType<typeof getDb>,
	botId: string,
	senderId: string,
) {
	const [conversation] = await db
		.select()
		.from(conversations)
		.where(and(eq(conversations.botId, botId), eq(conversations.senderId, senderId)))
		.limit(1)

	if (!conversation) {
		return []
	}

	const { asc } = await import('drizzle-orm')
	const conversationMessages = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, conversation.id))
		.orderBy(asc(messages.createdAt))

	return conversationMessages.map((msg) => ({
		...msg,
		createdAt: msg.createdAt.toISOString(),
	}))
}
