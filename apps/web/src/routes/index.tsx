import { useBots } from '@/slices/bots/hooks/use-bots'
import { useLeads } from '@/slices/leads/hooks/use-leads'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Skeleton } from '@/ui/skeleton'
import { createFileRoute } from '@tanstack/react-router'
import { Bot, MessageSquare, TrendingUp } from 'lucide-react'

export const Route = createFileRoute('/')({
	component: DashboardPage,
})

function DashboardPage() {
	const { data: botsData, isLoading: isLoadingBots } = useBots()
	const { data: leadsData, isLoading: isLoadingLeads } = useLeads()

	const totalBots = botsData?.meta.total ?? 0
	const totalLeads = leadsData?.meta.total ?? 0
	const activeBots = botsData?.data.filter((bot: { isActive: boolean }) => bot.isActive).length ?? 0

	return (
		<div className="p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">Overview of your GenAI bots</p>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				<StatCard icon={Bot} title="Total Bots" value={totalBots} isLoading={isLoadingBots} />
				<StatCard
					icon={TrendingUp}
					title="Active Bots"
					value={activeBots}
					isLoading={isLoadingBots}
				/>
				<StatCard
					icon={MessageSquare}
					title="Total Leads"
					value={totalLeads}
					isLoading={isLoadingLeads}
				/>
			</div>
		</div>
	)
}

function StatCard({
	icon: Icon,
	title,
	value,
	isLoading,
}: {
	icon: React.ElementType
	title: string
	value: number
	isLoading: boolean
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-8 w-16" />
				) : (
					<div className="text-2xl font-bold">{value}</div>
				)}
			</CardContent>
		</Card>
	)
}
