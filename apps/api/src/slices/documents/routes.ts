import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import {
	bulkDeleteResponseSchema,
	bulkDeleteSchema,
	createDocumentSchema,
	documentSchema,
	listQuerySchema,
	paginationMetaSchema,
	updateDocumentSchema,
} from '@repo/shared'
import { getDb } from '../../db/client'
import { errorResponses } from '../../lib/openapi-errors'
import {
	bulkDeleteDocuments,
	createDocument,
	deleteDocument,
	getDocumentById,
	listDocuments,
	updateDocument,
} from './service'

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
	tags: ['Documents'],
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
						data: z.array(documentSchema),
						meta: paginationMetaSchema,
					}),
				},
			},
			description: 'List of documents',
		},
	},
})

app.openapi(listRoute, async (c) => {
	const query = c.req.valid('query')
	const { botId, ...listQuery } = query
	const db = getDb()
	const result = await listDocuments(db, botId, listQuery)
	return c.json(result)
})

// DELETE /bulk
const bulkDeleteRoute = createRoute({
	method: 'delete',
	path: '/bulk',
	tags: ['Documents'],
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
	const result = await bulkDeleteDocuments(db, ids)
	return c.json(result)
})

// GET /:id
const getByIdRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Documents'],
	request: {
		params: idParamSchema,
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: documentSchema,
				},
			},
			description: 'Document details',
		},
		...errorResponses(404),
	},
})

app.openapi(getByIdRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	const document = await getDocumentById(db, id)
	return c.json(document)
})

// POST /
const createRoute_ = createRoute({
	method: 'post',
	path: '/',
	tags: ['Documents'],
	request: {
		body: {
			content: {
				'application/json': {
					schema: createDocumentSchema,
				},
			},
		},
	},
	responses: {
		201: {
			content: {
				'application/json': {
					schema: documentSchema,
				},
			},
			description: 'Document created',
		},
		...errorResponses(400),
	},
})

app.openapi(createRoute_, async (c) => {
	const data = c.req.valid('json')
	const db = getDb()
	const document = await createDocument(db, data)
	return c.json(document, 201)
})

// PATCH /:id
const updateRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['Documents'],
	request: {
		params: idParamSchema,
		body: {
			content: {
				'application/json': {
					schema: updateDocumentSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: documentSchema,
				},
			},
			description: 'Document updated',
		},
		...errorResponses(400, 404),
	},
})

app.openapi(updateRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = getDb()
	const document = await updateDocument(db, id, data)
	return c.json(document)
})

// DELETE /:id
const deleteRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Documents'],
	request: {
		params: idParamSchema,
	},
	responses: {
		204: {
			description: 'Document deleted',
		},
		...errorResponses(404),
	},
})

app.openapi(deleteRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	await deleteDocument(db, id)
	return c.body(null, 204)
})

export { app as documentsRoutes }
