import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import {
	bulkDeleteResponseSchema,
	bulkDeleteSchema,
	createLeadSchema,
	leadSchema,
	listQuerySchema,
	paginationMetaSchema,
	updateLeadSchema,
} from '@repo/shared'
import { getDb } from '../../db/client'
import { errorResponses } from '../../lib/openapi-errors'
import { bulkDeleteLeads, createLead, deleteLead, getLeadById, listLeads, updateLead } from './service'

const app = new OpenAPIHono()

const idParamSchema = z.object({
	id: z
		.string()
		.uuid()
		.openapi({ param: { name: 'id', in: 'path' } }),
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

// DELETE /bulk
const bulkDeleteRoute = createRoute({
	method: 'delete',
	path: '/bulk',
	tags: ['Leads'],
	request: {
		body: {
			content: {
				'application/json': {
					schema: bulkDeleteSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: bulkDeleteResponseSchema,
				},
			},
			description: 'Bulk delete result',
		},
		...errorResponses(400),
	},
})

app.openapi(bulkDeleteRoute, async (c) => {
	const { ids } = c.req.valid('json')
	const db = getDb()
	const result = await bulkDeleteLeads(db, ids)
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
		...errorResponses(404),
	},
})

app.openapi(getByIdRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	const lead = await getLeadById(db, id)
	return c.json(lead)
})

// POST /
const createRoute_ = createRoute({
	method: 'post',
	path: '/',
	tags: ['Leads'],
	request: {
		body: {
			content: {
				'application/json': {
					schema: createLeadSchema,
				},
			},
		},
	},
	responses: {
		201: {
			content: {
				'application/json': {
					schema: leadSchema,
				},
			},
			description: 'Lead created',
		},
		...errorResponses(400),
	},
})

app.openapi(createRoute_, async (c) => {
	const data = c.req.valid('json')
	const db = getDb()
	const lead = await createLead(db, data)
	return c.json(lead, 201)
})

// PATCH /:id
const updateRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['Leads'],
	request: {
		params: idParamSchema,
		body: {
			content: {
				'application/json': {
					schema: updateLeadSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: leadSchema,
				},
			},
			description: 'Lead updated',
		},
		...errorResponses(400, 404),
	},
})

app.openapi(updateRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = getDb()
	const lead = await updateLead(db, id, data)
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
		...errorResponses(404),
	},
})

app.openapi(deleteRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	await deleteLead(db, id)
	return c.body(null, 204)
})

export { app as leadsRoutes }
