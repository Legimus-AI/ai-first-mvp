import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from '../users/schema'

export const bots = pgTable('bots', {
	id: uuid('id').primaryKey().default(sql`uuidv7()`),
	name: text('name').notNull(),
	systemPrompt: text('system_prompt').notNull(),
	model: text('model').notNull().default('gemini-2.0-flash'),
	welcomeMessage: text('welcome_message').notNull().default('Hi! How can I help you today?'),
	userId: uuid('user_id').notNull().references(() => users.id),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
