import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
	id: uuid('id').primaryKey().default(sql`uuidv7()`),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'user'] })
		.notNull()
		.default('user'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
