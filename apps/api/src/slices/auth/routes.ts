import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import {
	AppError,
	authResponseSchema,
	createUserSchema,
	errorResponseSchema,
	loginSchema,
	userSchema,
} from '@repo/shared'
import { getDb } from '../../db/client'
import { generateToken, login, register } from './service'

const app = new OpenAPIHono()

// POST /register
const registerRoute = createRoute({
	method: 'post',
	path: '/register',
	tags: ['Auth'],
	request: {
		body: {
			content: {
				'application/json': {
					schema: createUserSchema,
				},
			},
		},
	},
	responses: {
		201: {
			content: {
				'application/json': {
					schema: authResponseSchema,
				},
			},
			description: 'User registered successfully',
		},
	},
})

app.openapi(registerRoute, async (c) => {
	const data = c.req.valid('json')
	const db = getDb()

	const user = await register(db, data)

	// NOTE: Using process.env here is an exception to the isomorphic code rule.
	// Auth service is backend-only and will never run in a browser.
	// JWT_SECRET is required by env validation, guaranteed to be present.
	const jwtSecret = process.env.JWT_SECRET as string

	const token = await generateToken(user, jwtSecret)

	return c.json(
		{
			token,
			user: {
				...user,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt.toISOString(),
			},
		},
		201,
	)
})

// POST /login
const loginRoute = createRoute({
	method: 'post',
	path: '/login',
	tags: ['Auth'],
	request: {
		body: {
			content: {
				'application/json': {
					schema: loginSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: authResponseSchema,
				},
			},
			description: 'Login successful',
		},
	},
})

app.openapi(loginRoute, async (c) => {
	const { email, password } = c.req.valid('json')
	const db = getDb()

	const user = await login(db, email, password)

	// NOTE: Using process.env here is an exception to the isomorphic code rule.
	// Auth service is backend-only and will never run in a browser.
	// JWT_SECRET is required by env validation, guaranteed to be present.
	const jwtSecret = process.env.JWT_SECRET as string

	const token = await generateToken(user, jwtSecret)

	return c.json(
		{
			token,
			user: {
				...user,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt.toISOString(),
			},
		},
		200,
	)
})

// GET /me
const meRoute = createRoute({
	method: 'get',
	path: '/me',
	tags: ['Auth'],
	responses: {
		200: {
			content: {
				'application/json': {
					schema: userSchema,
				},
			},
			description: 'Current user',
		},
	},
})

app.openapi(meRoute, async (c) => {
	const payload = c.get('jwtPayload')
	if (!payload || !payload.sub) {
		throw AppError.unauthorized('JWT payload not found')
	}

	const db = getDb()
	const { users } = await import('../users/schema')
	const { eq } = await import('drizzle-orm')

	const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)

	if (!user) {
		throw AppError.notFound('User not found')
	}

	const { passwordHash: _, ...userWithoutPassword } = user

	return c.json({
		...userWithoutPassword,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	})
})

export { app as authRoutes }
