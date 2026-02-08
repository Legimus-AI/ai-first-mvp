import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import type { Bot } from '@repo/shared'
import { Edit, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDeleteBot } from '../hooks/use-bots'
import { BotForm } from './bot-form'

interface BotTableProps {
	bots: Bot[]
}

export function BotTable({ bots }: BotTableProps) {
	const [editingBot, setEditingBot] = useState<Bot | null>(null)
	const deleteMutation = useDeleteBot()

	const handleDelete = async (id: string) => {
		if (confirm('Are you sure you want to delete this bot?')) {
			await deleteMutation.mutateAsync(id)
		}
	}

	if (bots.length === 0) {
		return (
			<div className="flex h-48 items-center justify-center rounded-md border border-border bg-muted/30">
				<p className="text-muted-foreground">
					No bots found. Create your first bot to get started.
				</p>
			</div>
		)
	}

	return (
		<>
			<div className="overflow-x-auto rounded-md border border-border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted/50">
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Model</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
							<th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
						</tr>
					</thead>
					<tbody>
						{bots.map((bot) => (
							<tr key={bot.id} className="border-b border-border last:border-0 hover:bg-muted/30">
								<td className="px-4 py-3 font-medium">{bot.name}</td>
								<td className="px-4 py-3 text-muted-foreground">{bot.model}</td>
								<td className="px-4 py-3">
									<Badge variant={bot.isActive ? 'default' : 'secondary'}>
										{bot.isActive ? 'Active' : 'Inactive'}
									</Badge>
								</td>
								<td className="px-4 py-3 text-muted-foreground">
									{new Date(bot.createdAt).toLocaleDateString()}
								</td>
								<td className="px-4 py-3 text-right">
									<div className="flex items-center justify-end gap-2">
										<Button variant="ghost" size="icon" onClick={() => setEditingBot(bot)}>
											<Edit className="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="icon" onClick={() => handleDelete(bot.id)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{editingBot && (
				<BotForm open={!!editingBot} onClose={() => setEditingBot(null)} bot={editingBot} />
			)}
		</>
	)
}
