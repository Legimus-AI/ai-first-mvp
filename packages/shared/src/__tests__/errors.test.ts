import { describe, expect, it } from 'vitest'
import { AppError, errorCodeSchema, errorResponseSchema, getHttpStatus } from '../errors'

describe('errorCodeSchema', () => {
	const validCodes = [
		'VALIDATION_ERROR',
		'NOT_FOUND',
		'UNAUTHORIZED',
		'FORBIDDEN',
		'CONFLICT',
		'RATE_LIMITED',
		'INTERNAL_ERROR',
	] as const

	for (const code of validCodes) {
		it(`accepts ${code}`, () => {
			expect(errorCodeSchema.safeParse(code).success).toBe(true)
		})
	}

	it('rejects unknown code', () => {
		expect(errorCodeSchema.safeParse('UNKNOWN_ERROR').success).toBe(false)
	})
})

describe('getHttpStatus', () => {
	it('maps VALIDATION_ERROR to 400', () => expect(getHttpStatus('VALIDATION_ERROR')).toBe(400))
	it('maps NOT_FOUND to 404', () => expect(getHttpStatus('NOT_FOUND')).toBe(404))
	it('maps UNAUTHORIZED to 401', () => expect(getHttpStatus('UNAUTHORIZED')).toBe(401))
	it('maps FORBIDDEN to 403', () => expect(getHttpStatus('FORBIDDEN')).toBe(403))
	it('maps CONFLICT to 409', () => expect(getHttpStatus('CONFLICT')).toBe(409))
	it('maps RATE_LIMITED to 429', () => expect(getHttpStatus('RATE_LIMITED')).toBe(429))
	it('maps INTERNAL_ERROR to 500', () => expect(getHttpStatus('INTERNAL_ERROR')).toBe(500))
})

describe('AppError', () => {
	it('creates notFound with correct code and status', () => {
		const err = AppError.notFound('Thing missing')
		expect(err.code).toBe('NOT_FOUND')
		expect(err.status).toBe(404)
		expect(err.message).toBe('Thing missing')
		expect(err).toBeInstanceOf(Error)
	})

	it('creates validation with correct code', () => {
		const err = AppError.validation('Bad input')
		expect(err.code).toBe('VALIDATION_ERROR')
		expect(err.status).toBe(400)
	})

	it('creates unauthorized with default message', () => {
		const err = AppError.unauthorized()
		expect(err.message).toBe('Authentication required')
	})

	it('creates forbidden with default message', () => {
		const err = AppError.forbidden()
		expect(err.message).toBe('Insufficient permissions')
	})

	it('creates conflict with custom message', () => {
		const err = AppError.conflict('Already exists')
		expect(err.code).toBe('CONFLICT')
		expect(err.status).toBe(409)
	})

	it('creates internal with default message', () => {
		const err = AppError.internal()
		expect(err.message).toBe('Internal server error')
		expect(err.status).toBe(500)
	})
})

describe('errorResponseSchema', () => {
	it('accepts valid error response', () => {
		const result = errorResponseSchema.safeParse({
			error: { code: 'NOT_FOUND', message: 'Not found' },
		})
		expect(result.success).toBe(true)
	})

	it('accepts error response with requestId', () => {
		const result = errorResponseSchema.safeParse({
			error: {
				code: 'NOT_FOUND',
				message: 'Not found',
				requestId: '550e8400-e29b-41d4-a716-446655440000',
			},
		})
		expect(result.success).toBe(true)
	})

	it('rejects invalid error code', () => {
		const result = errorResponseSchema.safeParse({
			error: { code: 'INVALID', message: 'Bad' },
		})
		expect(result.success).toBe(false)
	})
})
