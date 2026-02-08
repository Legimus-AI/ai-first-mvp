import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
	botSchema,
	createBotSchema,
	errorResponseSchema,
	listQuerySchema,
	paginationMetaSchema,
	updateBotSchema,
} from '@repo/shared'
import { getDb } from '../../db/client'
import { createBot, deleteBot, getBotById, listBots, updateBot } from './service'

const app = new OpenAPIHono()

const idParamSchema = z.object({
	id: z.string().uuid().openapi({ param: { name: 'id', in: 'path' } }),
})

// GET /
const listRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Bots'],
	request: {
		query: listQuerySchema,
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: z.object({
						data: z.array(botSchema),
						meta: paginationMetaSchema,
					}),
				},
			},
			description: 'List of bots',
		},
	},
})

app.openapi(listRoute, async (c) => {
	const query = c.req.valid('query')
	const db = getDb()
	const result = await listBots(db, query)
	return c.json(result)
})

// GET /:id
const getByIdRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Bots'],
	request: {
		params: idParamSchema,
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: botSchema,
				},
			},
			description: 'Bot details',
		},
	},
})

app.openapi(getByIdRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	const bot = await getBotById(db, id)
	return c.json(bot)
})

// POST /
const createRoute_ = createRoute({
	method: 'post',
	path: '/',
	tags: ['Bots'],
	request: {
		body: {
			content: {
				'application/json': {
					schema: createBotSchema,
				},
			},
		},
	},
	responses: {
		201: {
			content: {
				'application/json': {
					schema: botSchema,
				},
			},
			description: 'Bot created',
		},
	},
})

app.openapi(createRoute_, async (c) => {
	const data = c.req.valid('json')
	const db = getDb()

	// Get userId from JWT
	const payload = c.get('jwtPayload')
	if (!payload || !payload.sub) {
		throw new Error('JWT payload not found')
	}

	const bot = await createBot(db, data, payload.sub)
	return c.json(bot, 201)
})

// PATCH /:id
const updateRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['Bots'],
	request: {
		params: idParamSchema,
		body: {
			content: {
				'application/json': {
					schema: updateBotSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: botSchema,
				},
			},
			description: 'Bot updated',
		},
	},
})

app.openapi(updateRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = getDb()
	const bot = await updateBot(db, id, data)
	return c.json(bot)
})

// DELETE /:id
const deleteRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Bots'],
	request: {
		params: idParamSchema,
	},
	responses: {
		204: {
			description: 'Bot deleted',
		},
	},
})

app.openapi(deleteRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	await deleteBot(db, id)
	return c.body(null, 204)
})

export { app as botsRoutes }
