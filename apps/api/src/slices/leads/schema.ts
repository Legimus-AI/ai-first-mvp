import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { bots } from '../bots/schema'

export const leads = pgTable('leads', {
	id: uuid('id').primaryKey().default(sql`uuidv7()`),
	botId: uuid('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
	senderId: text('sender_id').notNull(),
	name: text('name'),
	email: text('email'),
	phone: text('phone'),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
