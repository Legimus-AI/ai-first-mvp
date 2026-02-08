import { useBots } from '@/slices/bots/hooks/use-bots'
import { DocumentForm } from '@/slices/documents/components/document-form'
import { DocumentTable } from '@/slices/documents/components/document-table'
import { useDocuments } from '@/slices/documents/hooks/use-documents'
import { Button } from '@/ui/button'
import { Skeleton } from '@/ui/skeleton'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/documents/')({
	component: DocumentsPage,
})

function DocumentsPage() {
	const [botFilter, setBotFilter] = useState<string>('')
	const { data, isLoading, isError, error } = useDocuments(
		botFilter ? { botId: botFilter } : undefined,
	)
	const { data: botsData } = useBots()
	const [isFormOpen, setIsFormOpen] = useState(false)

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center p-4 py-12 md:p-8">
				<p className="text-sm text-destructive">Failed to load documents: {error.message}</p>
			</div>
		)
	}

	return (
		<div className="p-4 md:p-8">
			<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold md:text-3xl">Documents</h1>
					<p className="text-muted-foreground">Manage bot knowledge base documents</p>
				</div>
				<Button onClick={() => setIsFormOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create Document
				</Button>
			</div>

			<div className="mb-4">
				<label htmlFor="botFilter" className="mb-2 block text-sm font-medium">
					Filter by Bot
				</label>
				<select
					id="botFilter"
					value={botFilter}
					onChange={(e) => setBotFilter(e.target.value)}
					className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<option value="">All Bots</option>
					{botsData?.data.map((bot: { id: string; name: string }) => (
						<option key={bot.id} value={bot.id}>
							{bot.name}
						</option>
					))}
				</select>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			) : (
				<DocumentTable documents={data?.data ?? []} bots={botsData?.data ?? []} />
			)}

			<DocumentForm
				open={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				bots={botsData?.data ?? []}
			/>
		</div>
	)
}
