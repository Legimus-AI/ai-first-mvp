import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { bots } from '../bots/schema'

export const conversations = pgTable('conversations', {
	id: uuid('id').primaryKey().default(sql`uuidv7()`),
	botId: uuid('bot_id')
		.notNull()
		.references(() => bots.id, { onDelete: 'cascade' }),
	senderId: text('sender_id').notNull(),
	title: text('title'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const messages = pgTable('messages', {
	id: uuid('id').primaryKey().default(sql`uuidv7()`),
	conversationId: uuid('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
	content: text('content').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
