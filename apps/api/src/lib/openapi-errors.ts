import { z } from '@hono/zod-openapi'

/**
 * Per-status error schemas with z.literal() for accurate OpenAPI documentation.
 * Each status code gets its own schema with the exact error code and example message,
 * so Swagger UI and AI agents see correct examples per response.
 *
 * @example
 * responses: {
 *   200: { ... },
 *   ...errorResponses(404),          // single error
 *   ...errorResponses(400, 404),     // multiple errors
 * }
 */

// --- Per-status error schemas (pre-built constants, reused via $ref) ---

type ErrorConfig = { code: string; message: string; description: string }

const ERROR_CONFIGS: Record<number, ErrorConfig> = {
	400: { code: 'VALIDATION_ERROR', message: 'Invalid input data', description: 'Validation error' },
	401: { code: 'UNAUTHORIZED', message: 'Authentication required', description: 'Unauthorized' },
	403: { code: 'FORBIDDEN', message: 'Insufficient permissions', description: 'Forbidden' },
	404: { code: 'NOT_FOUND', message: 'Resource not found', description: 'Not found' },
	409: { code: 'CONFLICT', message: 'Resource already exists', description: 'Conflict' },
	429: {
		code: 'RATE_LIMITED',
		message: 'Too many requests, retry after Retry-After seconds',
		description: 'Rate limited',
	},
	500: { code: 'INTERNAL_ERROR', message: 'Internal server error', description: 'Internal error' },
}

function buildErrorSchema(config: ErrorConfig, name: string) {
	return z
		.object({
			error: z.object({
				code: z.literal(config.code),
				message: z.string().openapi({ example: config.message }),
				requestId: z
					.string()
					.uuid()
					.optional()
					.openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
			}),
		})
		.openapi(name)
}

// Pre-built schemas — each registered once as a named OpenAPI component
const ERROR_SCHEMAS: Record<number, ReturnType<typeof buildErrorSchema>> = {
	400: buildErrorSchema(ERROR_CONFIGS[400], 'ValidationError'),
	401: buildErrorSchema(ERROR_CONFIGS[401], 'UnauthorizedError'),
	403: buildErrorSchema(ERROR_CONFIGS[403], 'ForbiddenError'),
	404: buildErrorSchema(ERROR_CONFIGS[404], 'NotFoundError'),
	409: buildErrorSchema(ERROR_CONFIGS[409], 'ConflictError'),
	429: buildErrorSchema(ERROR_CONFIGS[429], 'RateLimitError'),
	500: buildErrorSchema(ERROR_CONFIGS[500], 'InternalError'),
}

export function errorResponses(...codes: number[]) {
	const result: Record<
		number,
		{
			content: { 'application/json': { schema: (typeof ERROR_SCHEMAS)[number] } }
			description: string
		}
	> = {}
	for (const code of codes) {
		const config = ERROR_CONFIGS[code]
		const schema = ERROR_SCHEMAS[code]
		if (config && schema) {
			result[code] = {
				content: { 'application/json': { schema } },
				description: config.description,
			}
		}
	}
	return result
}

/**
 * Middleware-level errors for authenticated endpoints.
 * Spread alongside route-specific errors:
 *   ...errorResponses(404), ...AUTH_ERRORS
 */
export const AUTH_ERRORS = errorResponses(401, 429, 500)

/**
 * Middleware-level errors for admin-only endpoints (auth + role check).
 * Spread alongside route-specific errors:
 *   ...errorResponses(404), ...ADMIN_ERRORS
 */
export const ADMIN_ERRORS = errorResponses(401, 403, 429, 500)

/**
 * Middleware-level errors for public endpoints (no auth required).
 *   ...errorResponses(400), ...PUBLIC_ERRORS
 */
export const PUBLIC_ERRORS = errorResponses(429, 500)
