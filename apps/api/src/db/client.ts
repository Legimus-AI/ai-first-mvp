import { drizzle } from 'drizzle-orm/postgres-js'
import pgClient from 'postgres'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null
let _sql: ReturnType<typeof pgClient> | null = null

export function initDb(connectionString: string) {
	_sql = pgClient(connectionString)
	_db = drizzle(_sql, { schema })
	return _db
}

export function getDb() {
	if (!_db) throw new Error('Database not initialized. Call initDb() first.')
	return _db
}

export async function checkDbHealth(): Promise<boolean> {
	if (!_sql) return false
	try {
		await _sql`SELECT 1`
		return true
	} catch {
		return false
	}
}
