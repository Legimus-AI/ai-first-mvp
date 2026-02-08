import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
	errorResponseSchema,
	leadSchema,
	listQuerySchema,
	paginationMetaSchema,
} from '@repo/shared'
import { getDb } from '../../db/client'
import { deleteLead, getLeadById, listLeads } from './service'

const app = new OpenAPIHono()

const idParamSchema = z.object({
	id: z.string().uuid().openapi({ param: { name: 'id', in: 'path' } }),
})

// GET /
const listRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Leads'],
	request: {
		query: listQuerySchema.extend({
			botId: z.string().uuid().optional(),
		}),
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: z.object({
						data: z.array(leadSchema),
						meta: paginationMetaSchema,
					}),
				},
			},
			description: 'List of leads',
		},
	},
})

app.openapi(listRoute, async (c) => {
	const query = c.req.valid('query')
	const { botId, ...listQuery } = query
	const db = getDb()
	const result = await listLeads(db, listQuery, botId)
	return c.json(result)
})

// GET /:id
const getByIdRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Leads'],
	request: {
		params: idParamSchema,
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: leadSchema,
				},
			},
			description: 'Lead details',
		},
	},
})

app.openapi(getByIdRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	const lead = await getLeadById(db, id)
	return c.json(lead)
})

// DELETE /:id
const deleteRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Leads'],
	request: {
		params: idParamSchema,
	},
	responses: {
		204: {
			description: 'Lead deleted',
		},
	},
})

app.openapi(deleteRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	await deleteLead(db, id)
	return c.body(null, 204)
})

export { app as leadsRoutes }
