import Redis from 'ioredis'

let _redis: Redis | null = null

export function initRedis(url: string): Redis {
	_redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true })
	return _redis
}

export function getRedis(): Redis {
	if (!_redis) throw new Error('Redis not initialized. Call initRedis() first.')
	return _redis
}

const CONTEXT_TTL = 3600 // 1 hour

export async function getCachedMessages(
	conversationId: string,
): Promise<Array<{ role: string; content: string }> | null> {
	const redis = getRedis()
	const cached = await redis.get(`conv:${conversationId}:messages`)
	if (!cached) return null
	return JSON.parse(cached)
}

export async function setCachedMessages(
	conversationId: string,
	messages: Array<{ role: string; content: string }>,
): Promise<void> {
	const redis = getRedis()
	await redis.set(`conv:${conversationId}:messages`, JSON.stringify(messages), 'EX', CONTEXT_TTL)
}

export async function checkRedisHealth(): Promise<boolean> {
	if (!_redis) return false
	try {
		await _redis.ping()
		return true
	} catch {
		return false
	}
}
