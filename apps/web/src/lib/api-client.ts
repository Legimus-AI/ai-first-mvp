import { hc } from 'hono/client'

// Get auth token from localStorage
function getAuthToken(): string | null {
	if (typeof window === 'undefined') return null
	return localStorage.getItem('auth_token')
}

// Hono RPC client — type-safe API calls derived from backend routes
// Automatically includes Authorization header if token exists
// TODO: Add AppType import from @repo/api once TypeScript workspace type resolution is configured
export function getApiClient() {
	const token = getAuthToken()
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const client = hc<any>('/', {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	})
	// Runtime works correctly - Hono RPC creates properties dynamically
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return client as any
}

// Default client instance
export const api = getApiClient()
