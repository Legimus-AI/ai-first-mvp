/**
 * Global route contract test — verifier-first architecture.
 *
 * Verifies that ALL expected endpoints exist in the OpenAPI spec.
 * Catches both "endpoint not implemented" and "slice not registered in app.ts".
 *
 * NO database needed — only inspects OpenAPI metadata from createRoute() definitions.
 * Runs in < 1 second.
 */
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { crudOperations, formatMissing, verifyOpenApiPaths } from '../lib/contract-testing'
import type { ExpectedOperation } from '../lib/contract-testing'

const app = createApp()
const doc = app.getOpenAPIDocument({
	openapi: '3.0.0',
	info: { title: 'Contract Test', version: '0.0.0' },
})

// --- CRUD Slices ---

interface SliceContract {
	name: string
	basePath: string
	exclude?: string[]
}

const CRUD_SLICES: SliceContract[] = [
	{ name: 'bots', basePath: '/api/bots' },
	{ name: 'documents', basePath: '/api/documents' },
	{ name: 'users', basePath: '/api/users' },
	{ name: 'leads', basePath: '/api/leads' },
	{
		name: 'conversations',
		basePath: '/api/conversations',
		exclude: ['CREATE', 'UPDATE'], // conversations created via /api/chat, not direct CRUD
	},
]

describe('Route contracts', () => {
	for (const slice of CRUD_SLICES) {
		describe(slice.name, () => {
			const ops = crudOperations(slice.basePath).filter(
				(op) => !slice.exclude?.includes(op.label),
			)

			it(`has all ${ops.length} required CRUD endpoints`, () => {
				const { missing } = verifyOpenApiPaths(doc, ops)
				if (missing.length > 0) {
					expect.fail(formatMissing(slice.name, missing))
				}
			})
		})
	}

	// --- Auth routes (special — not standard CRUD) ---

	describe('auth', () => {
		const authOps: ExpectedOperation[] = [
			{ method: 'post', path: '/api/auth/register', label: 'REGISTER' },
			{ method: 'post', path: '/api/auth/login', label: 'LOGIN' },
			{ method: 'get', path: '/api/auth/me', label: 'ME' },
		]

		it('has all required auth endpoints', () => {
			const { missing } = verifyOpenApiPaths(doc, authOps)
			if (missing.length > 0) {
				expect.fail(formatMissing('auth', missing))
			}
		})
	})

	// --- Chat routes (special — public widget API) ---

	describe('chat', () => {
		const chatOps: ExpectedOperation[] = [
			{ method: 'post', path: '/api/chat/{botId}', label: 'CHAT' },
			{ method: 'get', path: '/api/chat/history/{botId}', label: 'HISTORY' },
		]

		it('has all required chat endpoints', () => {
			const { missing } = verifyOpenApiPaths(doc, chatOps)
			if (missing.length > 0) {
				expect.fail(formatMissing('chat', missing))
			}
		})
	})
})
