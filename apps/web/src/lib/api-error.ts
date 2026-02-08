import { type ErrorCode, errorResponseSchema } from '@repo/shared'

export interface ApiError {
	code: ErrorCode
	message: string
	requestId?: string
}

export async function parseApiError(res: Response): Promise<ApiError> {
	try {
		const json = await res.json()
		const parsed = errorResponseSchema.safeParse(json)
		if (parsed.success) return parsed.data.error as ApiError
	} catch {
		// Response body not parseable
	}
	return {
		code: 'INTERNAL_ERROR',
		message: `Request failed with status ${res.status}`,
	}
}

export async function throwIfNotOk(res: Response): Promise<void> {
	if (!res.ok) {
		const error = await parseApiError(res)
		throw Object.assign(new Error(error.message), { code: error.code, requestId: error.requestId })
	}
}
