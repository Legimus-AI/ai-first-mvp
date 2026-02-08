/**
 * Contract testing utilities for verifier-first architecture.
 * Tests verify that routes EXIST in the OpenAPI spec — no DB, no handlers executed.
 *
 * Usage:
 *   const { missing } = verifyOpenApiPaths(doc, crudOperations('/api/bots'))
 *   expect(missing).toHaveLength(0)
 */

export interface ExpectedOperation {
	method: string
	path: string
	label: string
}

/**
 * Returns the 6 standard CRUD operations expected for a resource.
 * LIST, GET, CREATE, UPDATE, DELETE, BULK_DELETE
 */
export function crudOperations(basePath: string): ExpectedOperation[] {
	return [
		{ method: 'get', path: basePath, label: 'LIST' },
		{ method: 'get', path: `${basePath}/{id}`, label: 'GET' },
		{ method: 'post', path: basePath, label: 'CREATE' },
		{ method: 'patch', path: `${basePath}/{id}`, label: 'UPDATE' },
		{ method: 'delete', path: `${basePath}/{id}`, label: 'DELETE' },
		{ method: 'delete', path: `${basePath}/bulk`, label: 'BULK_DELETE' },
	]
}

/**
 * Verifies that expected operations exist in an OpenAPI document.
 * Returns lists of missing and found operations.
 */
export function verifyOpenApiPaths(
	doc: Record<string, unknown>,
	operations: ExpectedOperation[],
): { missing: ExpectedOperation[]; found: ExpectedOperation[] } {
	const paths = (doc as { paths?: Record<string, Record<string, unknown>> }).paths ?? {}
	const missing: ExpectedOperation[] = []
	const found: ExpectedOperation[] = []

	for (const op of operations) {
		const pathEntry = paths[op.path]
		if (pathEntry && op.method in pathEntry) {
			found.push(op)
		} else {
			missing.push(op)
		}
	}

	return { missing, found }
}

/**
 * Formats missing operations into a readable error message.
 */
export function formatMissing(sliceName: string, missing: ExpectedOperation[]): string {
	const lines = missing.map((m) => `  - ${m.method.toUpperCase()} ${m.path} (${m.label})`)
	return `Missing endpoints for ${sliceName}:\n${lines.join('\n')}`
}
