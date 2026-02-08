import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import {
	bulkDeleteResponseSchema,
	bulkDeleteSchema,
	chatRequestSchema,
	chatResponseSchema,
	conversationSchema,
	conversationWithMessagesSchema,
	listQuerySchema,
	messageSchema,
	paginationMetaSchema,
} from '@repo/shared'
import { getDb } from '../../db/client'
import { AUTH_ERRORS, PUBLIC_ERRORS, errorResponses } from '../../lib/openapi-errors'
import {
	bulkDeleteConversations,
	chat,
	deleteConversation,
	getConversationHistory,
	getConversationWithMessages,
	listConversations,
} from './service'

// Admin routes (authenticated)
const adminApp = new OpenAPIHono()

const idParamSchema = z.object({
	id: z
		.string()
		.uuid()
		.openapi({ param: { name: 'id', in: 'path' } }),
})

const botIdParamSchema = z.object({
	botId: z
		.string()
		.uuid()
		.openapi({ param: { name: 'botId', in: 'path' } }),
})

// GET /conversations
const listRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Conversations'],
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
						data: z.array(conversationSchema),
						meta: paginationMetaSchema,
					}),
				},
			},
			description: 'List of conversations',
		},
		...AUTH_ERRORS,
	},
})

adminApp.openapi(listRoute, async (c) => {
	const query = c.req.valid('query')
	const { botId, ...listQuery } = query
	const db = getDb()
	const result = await listConversations(db, listQuery, botId)
	return c.json(result)
})

// DELETE /conversations/bulk
const bulkDeleteRoute = createRoute({
	method: 'delete',
	path: '/bulk',
	tags: ['Conversations'],
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
		...AUTH_ERRORS,
	},
})

adminApp.openapi(bulkDeleteRoute, async (c) => {
	const { ids } = c.req.valid('json')
	const db = getDb()
	const result = await bulkDeleteConversations(db, ids)
	return c.json(result)
})

// GET /conversations/:id
const getByIdRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Conversations'],
	request: {
		params: idParamSchema,
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: conversationWithMessagesSchema,
				},
			},
			description: 'Conversation with messages',
		},
		...errorResponses(404),
		...AUTH_ERRORS,
	},
})

adminApp.openapi(getByIdRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	const conversation = await getConversationWithMessages(db, id)
	return c.json(conversation)
})

// DELETE /conversations/:id
const deleteRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Conversations'],
	request: {
		params: idParamSchema,
	},
	responses: {
		204: {
			description: 'Conversation deleted',
		},
		...errorResponses(404),
		...AUTH_ERRORS,
	},
})

adminApp.openapi(deleteRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	await deleteConversation(db, id)
	return c.body(null, 204)
})

// Public chat routes (no auth)
const chatApp = new OpenAPIHono()

// POST /chat/:botId
const chatRoute = createRoute({
	method: 'post',
	path: '/{botId}',
	tags: ['Chat'],
	request: {
		params: botIdParamSchema,
		body: {
			content: {
				'application/json': {
					schema: chatRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: chatResponseSchema,
				},
			},
			description: 'Chat response',
		},
		...errorResponses(400, 404),
		...PUBLIC_ERRORS,
	},
})

chatApp.openapi(chatRoute, async (c) => {
	const { botId } = c.req.valid('param')
	const { senderId, message } = c.req.valid('json')
	const db = getDb()

	const result = await chat(db, botId, senderId, message)
	return c.json(result)
})

// GET /chat/history/:botId
const historyRoute = createRoute({
	method: 'get',
	path: '/history/{botId}',
	tags: ['Chat'],
	request: {
		params: botIdParamSchema,
		query: z.object({
			senderId: z.string().min(1),
		}),
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: z.array(messageSchema),
				},
			},
			description: 'Message history',
		},
		...errorResponses(404),
		...PUBLIC_ERRORS,
	},
})

chatApp.openapi(historyRoute, async (c) => {
	const { botId } = c.req.valid('param')
	const { senderId } = c.req.valid('query')
	const db = getDb()

	const history = await getConversationHistory(db, botId, senderId)
	return c.json(history)
})

export { adminApp as conversationsRoutes, chatApp as chatRoutes }
