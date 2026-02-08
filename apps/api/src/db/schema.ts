// Barrel re-export — each slice owns its own schema
// Drizzle client imports this to get all tables in one place
export * from '../slices/users/schema'
export * from '../slices/bots/schema'
export * from '../slices/documents/schema'
export * from '../slices/leads/schema'
export * from '../slices/conversations/schema'
