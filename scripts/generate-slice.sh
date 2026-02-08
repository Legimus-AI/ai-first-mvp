#!/usr/bin/env bash
# R8 Generator Enforcement — scaffolds a new boundary slice
# Usage: pnpm generate:slice <slice-name>
# Example: pnpm generate:slice users
#
# Generated code matches the reference slice (todos):
# - Schemas: @hono/zod-openapi + .openapi() metadata + pagination
# - Routes: OpenAPIHono + createRoute() + AppError
# - Service: pure functions with Drizzle + ListQuery pagination
# - Hooks: Hono RPC + TanStack Query + throwIfNotOk
#
# Validated by: scripts/validate-generator.sh (runs in CI)

set -euo pipefail

if [ -z "${1:-}" ]; then
	echo "Usage: pnpm generate:slice <slice-name>"
	echo "Example: pnpm generate:slice users"
	exit 1
fi

SLICE="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Derive naming: users → user/User, Users
if [[ "$SLICE" == *s && ${#SLICE} -gt 2 ]]; then
	SINGULAR="${SLICE%s}"
else
	SINGULAR="$SLICE"
fi
SINGULAR_PASCAL="$(tr '[:lower:]' '[:upper:]' <<< "${SINGULAR:0:1}")${SINGULAR:1}"
PLURAL_PASCAL="$(tr '[:lower:]' '[:upper:]' <<< "${SLICE:0:1}")${SLICE:1}"

SHARED_DIR="$ROOT/packages/shared/src/slices/$SLICE"
API_DIR="$ROOT/apps/api/src/slices/$SLICE"
WEB_HOOKS_DIR="$ROOT/apps/web/src/slices/$SLICE/hooks"
WEB_COMPONENTS_DIR="$ROOT/apps/web/src/slices/$SLICE/components"

# Guard: slice already exists
if [ -d "$SHARED_DIR" ] || [ -d "$API_DIR" ]; then
	echo "Error: Slice '$SLICE' already exists"
	exit 1
fi

echo "Generating slice: $SLICE (entity: $SINGULAR)"

# --- 1. Shared schemas (source of truth) ---
mkdir -p "$SHARED_DIR"
cat > "$SHARED_DIR/schemas.ts" << TMPL
import { z } from '@hono/zod-openapi'
import { paginationMetaSchema } from '../../pagination'

// --- Domain schema (SINGLE SOURCE OF TRUTH) ---

export const ${SINGULAR}Schema = z
	.object({
		id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
		// TODO: add domain fields
		createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
	})
	.openapi('${SINGULAR_PASCAL}')

export type ${SINGULAR_PASCAL} = z.infer<typeof ${SINGULAR}Schema>

// --- Request schemas ---

export const create${SINGULAR_PASCAL}Schema = z
	.object({
		// TODO: add fields
	})
	.openapi('Create${SINGULAR_PASCAL}')

export type Create${SINGULAR_PASCAL} = z.infer<typeof create${SINGULAR_PASCAL}Schema>

export const update${SINGULAR_PASCAL}Schema = z
	.object({
		// TODO: add fields
	})
	.openapi('Update${SINGULAR_PASCAL}')

export type Update${SINGULAR_PASCAL} = z.infer<typeof update${SINGULAR_PASCAL}Schema>

// --- Param schemas ---

export const ${SINGULAR}IdParamSchema = z.object({
	id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
})

// --- Response schemas ---

export const ${SINGULAR}ListResponseSchema = z
	.object({
		data: z.array(${SINGULAR}Schema),
		meta: paginationMetaSchema,
	})
	.openapi('${SINGULAR_PASCAL}ListResponse')

export type ${SINGULAR_PASCAL}ListResponse = z.infer<typeof ${SINGULAR}ListResponseSchema>

export const ${SINGULAR}ResponseSchema = z
	.object({
		data: ${SINGULAR}Schema,
	})
	.openapi('${SINGULAR_PASCAL}Response')

export type ${SINGULAR_PASCAL}Response = z.infer<typeof ${SINGULAR}ResponseSchema>
TMPL

# --- 2. API schema (Drizzle table — co-located with slice) ---
mkdir -p "$API_DIR"
cat > "$API_DIR/schema.ts" << TMPL
import { sql } from 'drizzle-orm'
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const ${SLICE} = pgTable('${SLICE}', {
	id: uuid('id').primaryKey().default(sql\`uuidv7()\`),
	// TODO: add domain columns
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
TMPL

# --- 3. API service (pure business logic with pagination) ---
cat > "$API_DIR/service.ts" << TMPL
import type { Create${SINGULAR_PASCAL}, ListQuery, Update${SINGULAR_PASCAL} } from '@repo/shared'
import { AppError, buildPaginationMeta } from '@repo/shared'
import type { getDb } from '../../db/client'

type Db = ReturnType<typeof getDb>

export async function list${PLURAL_PASCAL}(db: Db, query: ListQuery) {
	const { page, limit } = query
	const offset = (page - 1) * limit
	// TODO: implement with Drizzle query + count
	const rows: unknown[] = []
	const total = 0
	return { data: rows, meta: buildPaginationMeta(query, total) }
}

export async function get${SINGULAR_PASCAL}ById(db: Db, id: string) {
	// TODO: implement
	throw AppError.notFound('${SINGULAR_PASCAL} not found')
}

export async function create${SINGULAR_PASCAL}(db: Db, input: Create${SINGULAR_PASCAL}) {
	// TODO: implement
	return null
}

export async function update${SINGULAR_PASCAL}(db: Db, id: string, input: Update${SINGULAR_PASCAL}) {
	// TODO: implement
	throw AppError.notFound('${SINGULAR_PASCAL} not found')
}

export async function delete${SINGULAR_PASCAL}(db: Db, id: string) {
	// TODO: implement
	throw AppError.notFound('${SINGULAR_PASCAL} not found')
}

export async function bulkDelete${PLURAL_PASCAL}(db: Db, ids: string[]) {
	// TODO: implement
	return { deleted: 0 }
}
TMPL

# --- 3. API routes (OpenAPIHono + createRoute + AppError) ---
cat > "$API_DIR/routes.ts" << TMPL
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import {
	AppError,
	bulkDeleteResponseSchema,
	bulkDeleteSchema,
	create${SINGULAR_PASCAL}Schema,
	listQuerySchema,
	${SINGULAR}Schema,
	${SINGULAR}ListResponseSchema,
	${SINGULAR}ResponseSchema,
	update${SINGULAR_PASCAL}Schema,
} from '@repo/shared'
import { getDb } from '../../db/client'
import { AUTH_ERRORS, errorResponses } from '../../lib/openapi-errors'
import * as service from './service'

const app = new OpenAPIHono()

const idParamSchema = z.object({
	id: z
		.string()
		.uuid()
		.openapi({ param: { name: 'id', in: 'path' } }),
})

// --- Route definitions (contracts) ---

const list${PLURAL_PASCAL}Route = createRoute({
	method: 'get',
	path: '/',
	tags: ['${PLURAL_PASCAL}'],
	summary: 'List ${SLICE} with pagination, search, and sorting',
	request: { query: listQuerySchema },
	responses: {
		200: {
			content: { 'application/json': { schema: ${SINGULAR}ListResponseSchema } },
			description: 'Paginated list of ${SLICE}',
		},
		...AUTH_ERRORS,
	},
})

app.openapi(list${PLURAL_PASCAL}Route, async (c) => {
	const query = c.req.valid('query')
	const db = getDb()
	const result = await service.list${PLURAL_PASCAL}(db, query)
	return c.json(result)
})

// DELETE /bulk (must be before /{id} to avoid path collision)
const bulkDelete${PLURAL_PASCAL}Route = createRoute({
	method: 'delete',
	path: '/bulk',
	tags: ['${PLURAL_PASCAL}'],
	summary: 'Bulk delete ${SLICE}',
	request: {
		body: { content: { 'application/json': { schema: bulkDeleteSchema } } },
	},
	responses: {
		200: {
			content: { 'application/json': { schema: bulkDeleteResponseSchema } },
			description: 'Bulk delete result',
		},
		...errorResponses(400),
		...AUTH_ERRORS,
	},
})

app.openapi(bulkDelete${PLURAL_PASCAL}Route, async (c) => {
	const { ids } = c.req.valid('json')
	const db = getDb()
	const result = await service.bulkDelete${PLURAL_PASCAL}(db, ids)
	return c.json(result)
})

const get${SINGULAR_PASCAL}Route = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['${PLURAL_PASCAL}'],
	summary: 'Get a ${SINGULAR} by ID',
	request: { params: idParamSchema },
	responses: {
		200: {
			content: { 'application/json': { schema: ${SINGULAR}Schema } },
			description: '${SINGULAR_PASCAL} details',
		},
		...errorResponses(404),
		...AUTH_ERRORS,
	},
})

app.openapi(get${SINGULAR_PASCAL}Route, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	const item = await service.get${SINGULAR_PASCAL}ById(db, id)
	return c.json(item)
})

const create${SINGULAR_PASCAL}Route = createRoute({
	method: 'post',
	path: '/',
	tags: ['${PLURAL_PASCAL}'],
	summary: 'Create a new ${SINGULAR}',
	request: {
		body: { content: { 'application/json': { schema: create${SINGULAR_PASCAL}Schema } }, required: true },
	},
	responses: {
		201: {
			content: { 'application/json': { schema: ${SINGULAR}Schema } },
			description: '${SINGULAR_PASCAL} created',
		},
		...errorResponses(400),
		...AUTH_ERRORS,
	},
})

app.openapi(create${SINGULAR_PASCAL}Route, async (c) => {
	const input = c.req.valid('json')
	const db = getDb()
	const item = await service.create${SINGULAR_PASCAL}(db, input)
	return c.json(item, 201)
})

const update${SINGULAR_PASCAL}Route = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['${PLURAL_PASCAL}'],
	summary: 'Update a ${SINGULAR}',
	request: {
		params: idParamSchema,
		body: { content: { 'application/json': { schema: update${SINGULAR_PASCAL}Schema } }, required: true },
	},
	responses: {
		200: {
			content: { 'application/json': { schema: ${SINGULAR}Schema } },
			description: '${SINGULAR_PASCAL} updated',
		},
		...errorResponses(400, 404),
		...AUTH_ERRORS,
	},
})

app.openapi(update${SINGULAR_PASCAL}Route, async (c) => {
	const { id } = c.req.valid('param')
	const input = c.req.valid('json')
	const db = getDb()
	const item = await service.update${SINGULAR_PASCAL}(db, id, input)
	return c.json(item)
})

const delete${SINGULAR_PASCAL}Route = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['${PLURAL_PASCAL}'],
	summary: 'Delete a ${SINGULAR}',
	request: { params: idParamSchema },
	responses: {
		204: {
			description: '${SINGULAR_PASCAL} deleted',
		},
		...errorResponses(404),
		...AUTH_ERRORS,
	},
})

app.openapi(delete${SINGULAR_PASCAL}Route, async (c) => {
	const { id } = c.req.valid('param')
	const db = getDb()
	await service.delete${SINGULAR_PASCAL}(db, id)
	return c.body(null, 204)
})

export { app as ${SLICE}Routes }
TMPL

# --- 4. Web hooks (Hono RPC + TanStack Query + throwIfNotOk) ---
mkdir -p "$WEB_HOOKS_DIR"
cat > "$WEB_HOOKS_DIR/use-${SLICE}.ts" << TMPL
import { api } from '@/lib/api-client'
import { throwIfNotOk } from '@/lib/api-error'
import type { Create${SINGULAR_PASCAL}, ListQuery, Update${SINGULAR_PASCAL} } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const KEY = ['${SLICE}'] as const

export function use${PLURAL_PASCAL}(params?: Partial<ListQuery>) {
	return useQuery({
		queryKey: [...KEY, params],
		queryFn: async () => {
			const res = await api.api.${SLICE}.\$get({ query: params ?? {} })
			await throwIfNotOk(res)
			return res.json()
		},
	})
}

export function useCreate${SINGULAR_PASCAL}() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (input: Create${SINGULAR_PASCAL}) => {
			const res = await api.api.${SLICE}.\$post({ json: input })
			await throwIfNotOk(res)
			return res.json()
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
	})
}

export function useUpdate${SINGULAR_PASCAL}() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, ...input }: Update${SINGULAR_PASCAL} & { id: string }) => {
			const res = await api.api.${SLICE}[':id'].\$patch({ param: { id }, json: input })
			await throwIfNotOk(res)
			return res.json()
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
	})
}

export function useDelete${SINGULAR_PASCAL}() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.api.${SLICE}[':id'].\$delete({ param: { id } })
			await throwIfNotOk(res)
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
	})
}

export function useBulkDelete${PLURAL_PASCAL}() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (ids: string[]) => {
			const res = await api.api.${SLICE}.bulk.\$delete({ json: { ids } })
			await throwIfNotOk(res)
			return res.json()
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
	})
}
TMPL

# --- 5. Web component placeholder ---
mkdir -p "$WEB_COMPONENTS_DIR"
cat > "$WEB_COMPONENTS_DIR/${SLICE}-list.tsx" << TMPL
import { use${PLURAL_PASCAL} } from '../hooks/use-${SLICE}'

export function ${SINGULAR_PASCAL}List() {
	const { data, isLoading, error } = use${PLURAL_PASCAL}()

	if (isLoading) return <p className="text-muted-foreground">Loading ${SLICE}...</p>
	if (error) return <p className="text-destructive">Error: {error.message}</p>

	return (
		<div className="mx-auto max-w-lg space-y-6">
			<p className="text-center text-xs text-muted-foreground">{data?.meta.total ?? 0} ${SLICE}</p>
		</div>
	)
}
TMPL

# --- 6. API route tests (TDD — these FAIL until implemented) ---
API_TESTS_DIR="$API_DIR/__tests__"
mkdir -p "$API_TESTS_DIR"
cat > "$API_TESTS_DIR/routes.test.ts" << TMPL
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../../app'
import { getDb, initDb } from '../../../db/client'

const TEST_DB_URL =
	process.env.DATABASE_URL ?? 'postgresql://skeleton:skeleton@localhost:5433/skeleton'

describe('${SLICE} routes', () => {
	let app: ReturnType<typeof createApp>

	beforeAll(() => {
		initDb(TEST_DB_URL)
		app = createApp()
	})

	// TODO: Implement these tests after wiring routes in app.ts

	it('GET /api/${SLICE} returns paginated list', async () => {
		const res = await app.request('/api/${SLICE}')
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body).toHaveProperty('data')
		expect(body).toHaveProperty('meta')
		expect(Array.isArray(body.data)).toBe(true)
	})

	it('POST /api/${SLICE} creates an item', async () => {
		const res = await app.request('/api/${SLICE}', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ /* TODO: add required fields */ }),
		})
		// Should be 201 once implemented
		expect([201, 400]).toContain(res.status)
	})

	it('GET /api/${SLICE}/:id returns 400 for invalid UUID', async () => {
		const res = await app.request('/api/${SLICE}/not-a-uuid')
		expect(res.status).toBe(400)
	})

	it('GET /api/${SLICE}/:id returns 404 for non-existent', async () => {
		const res = await app.request('/api/${SLICE}/00000000-0000-0000-0000-000000000000')
		expect(res.status).toBe(404)
		const body = await res.json()
		expect(body.error.code).toBe('NOT_FOUND')
	})

	it('DELETE /api/${SLICE}/:id returns 404 for non-existent', async () => {
		const res = await app.request('/api/${SLICE}/00000000-0000-0000-0000-000000000000', {
			method: 'DELETE',
		})
		expect(res.status).toBe(404)
	})
})
TMPL

# --- 7. Contract test (verifier-first — NO DB required) ---
cat > "$API_TESTS_DIR/routes.contract.test.ts" << TMPL
/**
 * Contract test for ${SLICE} — verifier-first architecture.
 * Verifies all required CRUD endpoints exist in OpenAPI spec.
 * NO database needed. Runs in < 1 second.
 *
 * If this test FAILS, it means an endpoint was removed or never implemented.
 * Fix: add the missing route in routes.ts and register in app.ts.
 */
import { describe, expect, it } from 'vitest'
import { createApp } from '../../../app'
import { crudOperations, formatMissing, verifyOpenApiPaths } from '../../../lib/contract-testing'

const app = createApp()
const doc = app.getOpenAPIDocument({
	openapi: '3.0.0',
	info: { title: 'Contract Test', version: '0.0.0' },
})

describe('${SLICE} route contracts', () => {
	const ops = crudOperations('/api/${SLICE}')

	it('has all 6 required CRUD endpoints', () => {
		const { missing } = verifyOpenApiPaths(doc, ops)
		if (missing.length > 0) {
			expect.fail(formatMissing('${SLICE}', missing))
		}
	})

	it.each([
		['LIST', 'get', '/api/${SLICE}'],
		['GET', 'get', '/api/${SLICE}/{id}'],
		['CREATE', 'post', '/api/${SLICE}'],
		['UPDATE', 'patch', '/api/${SLICE}/{id}'],
		['DELETE', 'delete', '/api/${SLICE}/{id}'],
		['BULK_DELETE', 'delete', '/api/${SLICE}/bulk'],
	])('%s endpoint exists (%s %s)', (label, method, path) => {
		const { missing } = verifyOpenApiPaths(doc, [{ method, path, label }])
		expect(missing).toHaveLength(0)
	})
})
TMPL

echo ""
echo "Slice '$SLICE' generated (entity: $SINGULAR). Next steps:"
echo "  1. Edit schemas:   packages/shared/src/slices/$SLICE/schemas.ts"
echo "  2. Export from:     packages/shared/src/index.ts"
echo "  3. Add DB columns:  apps/api/src/slices/$SLICE/schema.ts (already scaffolded with UUIDv7)"
echo "  4. Re-export table: apps/api/src/db/schema.ts → add: export * from '../slices/$SLICE/schema'"
echo "  5. Implement:       apps/api/src/slices/$SLICE/service.ts"
echo "  6. Register route:  apps/api/src/app.ts → app.route('/api/$SLICE', ${SLICE}Routes)"
echo "  7. Build UI:        apps/web/src/slices/$SLICE/components/"
echo "  8. Run:             pnpm db:generate && pnpm db:migrate"
echo "  9. Complete tests:  apps/api/src/slices/$SLICE/__tests__/routes.test.ts"
echo " 10. Contracts:       pnpm validate:contracts (runs automatically in pnpm verify)"
echo " 11. Verify:          pnpm verify"
