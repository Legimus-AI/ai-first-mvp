import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { bots } from '../bots/schema'

export const documents = pgTable('documents', {
	id: uuid('id').primaryKey().default(sql`uuidv7()`),
	botId: uuid('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	content: text('content').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
