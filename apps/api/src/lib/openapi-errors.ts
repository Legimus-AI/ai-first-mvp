import { errorResponseSchema } from '@repo/shared'

/**
 * Pre-built error response objects for OpenAPI route definitions.
 * Use in createRoute() responses to document error codes in Swagger UI.
 *
 * @example
 * responses: {
 *   200: { ... },
 *   ...errorResponses(404),          // single error
 *   ...errorResponses(400, 404),     // multiple errors
 * }
 */

const ERROR_DESCRIPTIONS: Record<number, string> = {
	400: 'Validation error',
	401: 'Unauthorized',
	403: 'Forbidden',
	404: 'Not found',
	409: 'Conflict',
	429: 'Rate limited',
}

const errorContent = {
	content: { 'application/json': { schema: errorResponseSchema } },
} as const

export function errorResponses(...codes: number[]) {
	const result: Record<number, { content: typeof errorContent.content; description: string }> = {}
	for (const code of codes) {
		result[code] = {
			...errorContent,
			description: ERROR_DESCRIPTIONS[code] ?? `Error ${code}`,
		}
	}
	return result
}
