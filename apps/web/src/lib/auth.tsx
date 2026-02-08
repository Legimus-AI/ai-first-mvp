import type { User } from '@repo/shared'
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { getApiClient } from './api-client'

interface AuthContextValue {
	user: User | null
	token: string | null
	isLoading: boolean
	isAuthenticated: boolean
	login: (token: string, user: User) => void
	logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [token, setToken] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const storedToken = localStorage.getItem('auth_token')
		if (!storedToken) {
			setIsLoading(false)
			return
		}

		const api = getApiClient()
		api.api.auth.me
			.$get()
			.then((res: Response) => {
				if (res.ok) {
					return res.json()
				}
				throw new Error('Failed to fetch user')
			})
			.then((data: { user: User }) => {
				setUser(data.user)
				setToken(storedToken)
			})
			.catch(() => {
				localStorage.removeItem('auth_token')
			})
			.finally(() => {
				setIsLoading(false)
			})
	}, [])

	const login = (newToken: string, newUser: User) => {
		localStorage.setItem('auth_token', newToken)
		setToken(newToken)
		setUser(newUser)
	}

	const logout = () => {
		localStorage.removeItem('auth_token')
		setToken(null)
		setUser(null)
	}

	const value: AuthContextValue = {
		user,
		token,
		isLoading,
		isAuthenticated: !!user,
		login,
		logout,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider')
	}
	return context
}
