import { BotForm } from '@/slices/bots/components/bot-form'
import { BotTable } from '@/slices/bots/components/bot-table'
import { useBots } from '@/slices/bots/hooks/use-bots'
import { Button } from '@/ui/button'
import { Skeleton } from '@/ui/skeleton'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/bots/')({
	component: BotsPage,
})

function BotsPage() {
	const { data, isLoading, isError, error } = useBots()
	const [isFormOpen, setIsFormOpen] = useState(false)

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<p className="text-sm text-destructive">Failed to load bots: {error.message}</p>
			</div>
		)
	}

	return (
		<div className="p-8">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Bots</h1>
					<p className="text-muted-foreground">Manage your AI chatbots</p>
				</div>
				<Button onClick={() => setIsFormOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create Bot
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			) : (
				<BotTable bots={data?.data ?? []} />
			)}

			<BotForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />
		</div>
	)
}
