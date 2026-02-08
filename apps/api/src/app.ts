import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { honoLogger } from '@logtape/hono'
import { AppError } from '@repo/shared'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { checkDbHealth } from './db/client'
import { getAppLogger } from './logger'
import { authGuard } from './middleware/auth'
import { rateLimiter } from './middleware/rate-limit'
import { requestId } from './middleware/request-id'
import { authRoutes } from './slices/auth/routes'
import { botsRoutes } from './slices/bots/routes'
import { chatRoutes, conversationsRoutes } from './slices/conversations/routes'
import { documentsRoutes } from './slices/documents/routes'
import { leadsRoutes } from './slices/leads/routes'
import { usersRoutes } from './slices/users/routes'

export interface AppConfig {
	corsOrigin?: string
	jwtSecret?: string
}

export function createApp(config: AppConfig = {}): OpenAPIHono {
	const app = new OpenAPIHono()

	// --- Middleware ---

	app.use('*', requestId())
	app.use('*', honoLogger())
	app.use('*', secureHeaders())
	app.use('*', rateLimiter())

	const allowedOrigins = (config.corsOrigin || 'http://localhost:5173').split(',')
	app.use(
		'*',
		cors({
			origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
			credentials: true,
		}),
	)

	if (config.jwtSecret) {
		app.use(
			'*',
			authGuard({ secret: config.jwtSecret, exclude: ['/health', '/api/chat', '/api/auth'] }),
		)
	}

	// --- Global error handler ---

	const errorLog = getAppLogger('error')

	app.onError((err, c) => {
		const rid = c.get('requestId')

		if (err instanceof AppError) {
			errorLog.error('{code} {method} {path}: {message} ({requestId})', {
				code: err.code,
				method: c.req.method,
				path: c.req.path,
				message: err.message,
				requestId: rid,
			})
			return c.json(
				{ error: { code: err.code, message: err.message, requestId: rid } },
				err.status as 400,
			)
		}

		// Zod validation errors from @hono/zod-openapi
		const status = 'status' in err ? (err as { status: number }).status : 500
		const code = status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
		errorLog.error('{code} {method} {path}: {message} ({requestId})', {
			code,
			method: c.req.method,
			path: c.req.path,
			message: err.message,
			requestId: rid,
		})
		return c.json({ error: { code, message: err.message, requestId: rid } }, status as 400 | 500)
	})

	app.notFound((c) => {
		const rid = c.get('requestId')
		return c.json(
			{
				error: {
					code: 'NOT_FOUND',
					message: `${c.req.method} ${c.req.path} not found`,
					requestId: rid,
				},
			},
			404,
		)
	})

	// --- Health ---

	app.get('/health', async (c) => {
		const dbOk = await checkDbHealth()
		const uptime = Math.floor(performance.now() / 1000)
		if (dbOk) {
			return c.json({ status: 'ok', db: 'ok', uptime })
		}
		return c.json({ status: 'degraded', db: 'down', uptime }, 503)
	})

	// --- Routes ---

	const routes = app
		.route('/api/auth', authRoutes)
		.route('/api/users', usersRoutes)
		.route('/api/bots', botsRoutes)
		.route('/api/documents', documentsRoutes)
		.route('/api/leads', leadsRoutes)
		.route('/api/conversations', conversationsRoutes)
		.route('/api/chat', chatRoutes)

	// --- OpenAPI spec + Swagger UI ---

	app.doc('/doc', {
		openapi: '3.0.0',
		info: {
			title: 'AI First MVP API',
			version: '1.0.0',
			description: 'GenAI bots for e-commerce SaaS API',
		},
	})

	app.get('/ui', swaggerUI({ url: '/doc' }))

	return routes
}

// Default export for Hono RPC type inference (consumed by apps/web via `import type`)
const _app = createApp()
export type AppType = typeof _app
