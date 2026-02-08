import { useBots } from '@/slices/bots/hooks/use-bots'
import { LeadTable } from '@/slices/leads/components/lead-table'
import { useLeads } from '@/slices/leads/hooks/use-leads'
import { Skeleton } from '@/ui/skeleton'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/leads/')({
	component: LeadsPage,
})

function LeadsPage() {
	const [botFilter, setBotFilter] = useState<string>('')
	const { data, isLoading } = useLeads(botFilter ? { botId: botFilter } : undefined)
	const { data: botsData } = useBots()

	return (
		<div className="p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">Leads</h1>
				<p className="text-muted-foreground">View captured leads from conversations</p>
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
				<LeadTable leads={data?.data ?? []} bots={botsData?.data ?? []} />
			)}
		</div>
	)
}
