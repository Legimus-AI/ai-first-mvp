import { getApiClient } from '@/lib/api-client'
import { throwIfNotOk } from '@/lib/api-error'
import type { ListQuery } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useLeads(query?: Partial<ListQuery & { botId?: string }>) {
	return useQuery({
		queryKey: ['leads', query],
		queryFn: async () => {
			const api = getApiClient()
			const res = await api.api.leads.$get({ query: query as Record<string, string> })
			await throwIfNotOk(res)
			return res.json()
		},
	})
}

export function useLead(id: string) {
	return useQuery({
		queryKey: ['leads', id],
		queryFn: async () => {
			const api = getApiClient()
			const res = await api.api.leads[':id'].$get({ param: { id } })
			await throwIfNotOk(res)
			return res.json()
		},
		enabled: !!id,
	})
}

export function useDeleteLead() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const api = getApiClient()
			const res = await api.api.leads[':id'].$delete({ param: { id } })
			await throwIfNotOk(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['leads'] })
			toast.success('Lead deleted successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})
}
