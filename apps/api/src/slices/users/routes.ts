import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import {
	bulkDeleteResponseSchema,
	bulkDeleteSchema,
	createUserSchema,
	errorResponseSchema,
	listQuerySchema,
	paginationMetaSchema,
	updateUserSchema,
	userSchema,
} from '@repo/shared'
import { getDb } from '../../db/client'
import { bulkDeleteUsers, createUser, deleteUser, getUserById, listUsers, updateUser } from './service'

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
	tags: ['Users'],
	request: {
		query: listQuerySchema,
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: z.object({
						data: z.array(userSchema),
						meta: paginationMetaSchema,
					}),
				},
			},
			description: 'List of users',
		},
	},
})

app.openapi(listRoute, async (c) => {
	const query = c.req.valid('query')
	const db = getDb()
	const result = await listUsers(db, query)
	return c.json(result)
})

// DELETE /bulk
const bulkDeleteRoute = createRoute({
	method: 'delete',
	path: '/bulk',
	tags: ['Users'],
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
	},
})

app.openapi(bulkDeleteRoute, async (c) => {
	const { ids } = c.req.valid('json')
	const db = getDb()
	const result = await bulkDeleteUsers(db, ids)
	return c.json(result)
})

// GET /:id
const getByIdRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Users'],
	request: {
		params: idParamSchema,
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: userSchema,
				},
			},
			description: 'User details',
		},
	},
})

app.openapi(getByIdRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	const user = await getUserById(db, id)
	return c.json(user)
})

// POST /
const createRoute_ = createRoute({
	method: 'post',
	path: '/',
	tags: ['Users'],
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
					schema: userSchema,
				},
			},
			description: 'User created',
		},
	},
})

app.openapi(createRoute_, async (c) => {
	const data = c.req.valid('json')
	const db = getDb()
	const user = await createUser(db, data)
	return c.json(user, 201)
})

// PATCH /:id
const updateRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['Users'],
	request: {
		params: idParamSchema,
		body: {
			content: {
				'application/json': {
					schema: updateUserSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: userSchema,
				},
			},
			description: 'User updated',
		},
	},
})

app.openapi(updateRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = getDb()
	const user = await updateUser(db, id, data)
	return c.json(user)
})

// DELETE /:id
const deleteRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Users'],
	request: {
		params: idParamSchema,
	},
	responses: {
		204: {
			description: 'User deleted',
		},
	},
})

app.openapi(deleteRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	await deleteUser(db, id)
	return c.body(null, 204)
})

export { app as usersRoutes }
