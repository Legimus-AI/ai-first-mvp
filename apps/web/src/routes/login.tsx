import { useAuth } from '@/lib/auth'
import { getApiClient } from '@/lib/api-client'
import { throwIfNotOk } from '@/lib/api-error'
import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { type LoginRequest, loginSchema } from '@repo/shared'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/login')({
	component: LoginPage,
})

function LoginPage() {
	const { login } = useAuth()
	const navigate = useNavigate()
	const [isSubmitting, setIsSubmitting] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginRequest>({
		resolver: zodResolver(loginSchema),
	})

	const onSubmit = async (data: LoginRequest) => {
		setIsSubmitting(true)
		try {
			const api = getApiClient()
			const res = await api.api.auth.login.$post({ json: data })
			await throwIfNotOk(res)
			const result = await res.json()
			login(result.token, result.user)
			toast.success('Login successful')
			navigate({ to: '/' })
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Login failed')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/30">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Login</CardTitle>
					<CardDescription>Sign in to your account</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="email" className="text-sm font-medium">
								Email
							</label>
							<Input
								id="email"
								type="email"
								{...register('email')}
								error={!!errors.email}
								placeholder="admin@example.com"
							/>
							{errors.email && (
								<p className="text-sm text-destructive">{errors.email.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<label htmlFor="password" className="text-sm font-medium">
								Password
							</label>
							<Input
								id="password"
								type="password"
								{...register('password')}
								error={!!errors.password}
								placeholder="Enter your password"
							/>
							{errors.password && (
								<p className="text-sm text-destructive">{errors.password.message}</p>
							)}
						</div>
						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? 'Signing in...' : 'Sign in'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
