import { getApiClient } from '@/lib/api-client'
import { throwIfNotOk } from '@/lib/api-error'
import type { CreateDocument, ListQuery, UpdateDocument } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useDocuments(query?: Partial<ListQuery & { botId?: string }>) {
	return useQuery({
		queryKey: ['documents', query],
		queryFn: async () => {
			const api = getApiClient()
			const res = await api.api.documents.$get({ query: query as Record<string, string> })
			await throwIfNotOk(res)
			return res.json()
		},
	})
}

export function useDocument(id: string) {
	return useQuery({
		queryKey: ['documents', id],
		queryFn: async () => {
			const api = getApiClient()
			const res = await api.api.documents[':id'].$get({ param: { id } })
			await throwIfNotOk(res)
			return res.json()
		},
		enabled: !!id,
	})
}

export function useCreateDocument() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: CreateDocument) => {
			const api = getApiClient()
			const res = await api.api.documents.$post({ json: data })
			await throwIfNotOk(res)
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] })
			toast.success('Document created successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})
}

export function useUpdateDocument(id: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: UpdateDocument) => {
			const api = getApiClient()
			const res = await api.api.documents[':id'].$patch({ param: { id }, json: data })
			await throwIfNotOk(res)
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] })
			queryClient.invalidateQueries({ queryKey: ['documents', id] })
			toast.success('Document updated successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})
}

export function useDeleteDocument() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const api = getApiClient()
			const res = await api.api.documents[':id'].$delete({ param: { id } })
			await throwIfNotOk(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] })
			toast.success('Document deleted successfully')
		},
		onError: (error: Error) => {
			toast.error(error.message)
		},
	})
}
