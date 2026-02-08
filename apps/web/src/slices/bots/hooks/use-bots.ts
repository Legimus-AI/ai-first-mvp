import { getApiClient } from '@/lib/api-client'
import { throwIfNotOk } from '@/lib/api-error'
import type { Bot, CreateBot, ListQuery, UpdateBot } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useBots(query?: Partial<ListQuery>) {
	return useQuery({
		queryKey: ['bots', query],
		queryFn: async () => {
			const api = getApiClient()
			const res = await api.api.bots.$get({ query: query as any })
			await throwIfNotOk(res)
			return res.json()
		},
	})
}

export function useBot(id: string) {
	return useQuery({
		queryKey: ['bots', id],
		queryFn: async () => {
			const api = getApiClient()
			const res = await api.api.bots[':id'].$get({ param: { id } })
			await throwIfNotOk(res)
			return res.json()
		},
		enabled: !!id,
	})
}

export function useCreateBot() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: CreateBot) => {
			const api = getApiClient()
			const res = await api.api.bots.$post({ json: data })
			await throwIfNotOk(res)
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bots'] })
			toast.success('Bot created successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})
}

export function useUpdateBot(id: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: UpdateBot) => {
			const api = getApiClient()
			const res = await api.api.bots[':id'].$patch({ param: { id }, json: data })
			await throwIfNotOk(res)
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bots'] })
			queryClient.invalidateQueries({ queryKey: ['bots', id] })
			toast.success('Bot updated successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})
}

export function useDeleteBot() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const api = getApiClient()
			const res = await api.api.bots[':id'].$delete({ param: { id } })
			await throwIfNotOk(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bots'] })
			toast.success('Bot deleted successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})
}
