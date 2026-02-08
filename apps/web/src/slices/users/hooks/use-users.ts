import { getApiClient } from '@/lib/api-client'
import { throwIfNotOk } from '@/lib/api-error'
import type { ListQuery, UpdateUser } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useUsers(query?: Partial<ListQuery>) {
	return useQuery({
		queryKey: ['users', query],
		queryFn: async () => {
			const api = getApiClient()
			const res = await api.api.users.$get({ query: query as any })
			await throwIfNotOk(res)
			return res.json()
		},
	})
}

export function useUser(id: string) {
	return useQuery({
		queryKey: ['users', id],
		queryFn: async () => {
			const api = getApiClient()
			const res = await api.api.users[':id'].$get({ param: { id } })
			await throwIfNotOk(res)
			return res.json()
		},
		enabled: !!id,
	})
}

export function useUpdateUser(id: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: UpdateUser) => {
			const api = getApiClient()
			const res = await api.api.users[':id'].$patch({ param: { id }, json: data })
			await throwIfNotOk(res)
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] })
			queryClient.invalidateQueries({ queryKey: ['users', id] })
			toast.success('User updated successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})
}

export function useDeleteUser() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const api = getApiClient()
			const res = await api.api.users[':id'].$delete({ param: { id } })
			await throwIfNotOk(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] })
			toast.success('User deleted successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})
}
