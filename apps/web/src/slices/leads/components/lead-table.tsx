import { Button } from '@/ui/button'
import type { Bot, Lead } from '@repo/shared'
import { Trash2 } from 'lucide-react'
import { useDeleteLead } from '../hooks/use-leads'

interface LeadTableProps {
	leads: Lead[]
	bots: Bot[]
}

export function LeadTable({ leads, bots }: LeadTableProps) {
	const deleteMutation = useDeleteLead()

	const handleDelete = async (id: string) => {
		if (confirm('Are you sure you want to delete this lead?')) {
			await deleteMutation.mutateAsync(id)
		}
	}

	const getBotName = (botId: string) => {
		return bots.find((b) => b.id === botId)?.name ?? 'Unknown'
	}

	if (leads.length === 0) {
		return (
			<div className="flex h-48 items-center justify-center rounded-md border border-border bg-muted/30">
				<p className="text-muted-foreground">No leads captured yet.</p>
			</div>
		)
	}

	return (
		<div className="rounded-md border border-border">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border bg-muted/50">
						<th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
						<th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
						<th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
						<th className="px-4 py-3 text-left font-medium text-muted-foreground">Bot</th>
						<th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
						<th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
					</tr>
				</thead>
				<tbody>
					{leads.map((lead) => (
						<tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30">
							<td className="px-4 py-3 font-medium">{lead.name ?? '-'}</td>
							<td className="px-4 py-3 text-muted-foreground">{lead.email ?? '-'}</td>
							<td className="px-4 py-3 text-muted-foreground">{lead.phone ?? '-'}</td>
							<td className="px-4 py-3 text-muted-foreground">{getBotName(lead.botId)}</td>
							<td className="px-4 py-3 text-muted-foreground">
								{new Date(lead.createdAt).toLocaleDateString()}
							</td>
							<td className="px-4 py-3 text-right">
								<Button variant="ghost" size="icon" onClick={() => handleDelete(lead.id)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
