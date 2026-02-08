import { z } from '@hono/zod-openapi'

// --- Error codes (SINGLE SOURCE OF TRUTH) ---

export const errorCodeSchema = z
	.enum([
		'VALIDATION_ERROR',
		'NOT_FOUND',
		'UNAUTHORIZED',
		'FORBIDDEN',
		'CONFLICT',
		'RATE_LIMITED',
		'INTERNAL_ERROR',
	])
	.openapi('ErrorCode')

export type ErrorCode = z.infer<typeof errorCodeSchema>

// --- HTTP status mapping ---

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
	VALIDATION_ERROR: 400,
	NOT_FOUND: 404,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	CONFLICT: 409,
	RATE_LIMITED: 429,
	INTERNAL_ERROR: 500,
}

export function getHttpStatus(code: ErrorCode): number {
	return ERROR_STATUS_MAP[code]
}

// --- Error response schema (for OpenAPI docs) ---

export const errorResponseSchema = z
	.object({
		error: z.object({
			code: errorCodeSchema,
			message: z.string().openapi({ example: 'Resource not found' }),
			requestId: z
				.string()
				.uuid()
				.optional()
				.openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
		}),
	})
	.openapi('ErrorResponse')

export type ErrorResponse = z.infer<typeof errorResponseSchema>

// --- AppError class (throwable in services) ---

export class AppError extends Error {
	readonly code: ErrorCode
	readonly status: number

	constructor(code: ErrorCode, message: string) {
		super(message)
		this.name = 'AppError'
		this.code = code
		this.status = getHttpStatus(code)
	}

	static notFound(message = 'Resource not found') {
		return new AppError('NOT_FOUND', message)
	}

	static validation(message: string) {
		return new AppError('VALIDATION_ERROR', message)
	}

	static unauthorized(message = 'Authentication required') {
		return new AppError('UNAUTHORIZED', message)
	}

	static forbidden(message = 'Insufficient permissions') {
		return new AppError('FORBIDDEN', message)
	}

	static conflict(message: string) {
		return new AppError('CONFLICT', message)
	}

	static internal(message = 'Internal server error') {
		return new AppError('INTERNAL_ERROR', message)
	}
}
