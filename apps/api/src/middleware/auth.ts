import type { MiddlewareHandler } from 'hono'
import { jwt } from 'hono/jwt'

export interface AuthConfig {
	secret: string
	exclude?: string[]
}

export function authGuard(config: AuthConfig): MiddlewareHandler {
	const jwtMiddleware = jwt({ secret: config.secret, alg: 'HS256' })

	return async (c, next) => {
		if (config.exclude?.some((p) => c.req.path === p || c.req.path.startsWith(`${p}/`))) {
			await next()
			return
		}
		return jwtMiddleware(c, next)
	}
}
