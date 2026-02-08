import { Button } from '@/ui/button'
import type { Bot, Document } from '@repo/shared'
import { Edit, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDeleteDocument } from '../hooks/use-documents'
import { DocumentForm } from './document-form'

interface DocumentTableProps {
	documents: Document[]
	bots: Bot[]
}

export function DocumentTable({ documents, bots }: DocumentTableProps) {
	const [editingDocument, setEditingDocument] = useState<Document | null>(null)
	const deleteMutation = useDeleteDocument()

	const handleDelete = async (id: string) => {
		if (confirm('Are you sure you want to delete this document?')) {
			await deleteMutation.mutateAsync(id)
		}
	}

	const getBotName = (botId: string) => {
		return bots.find((b) => b.id === botId)?.name ?? 'Unknown'
	}

	if (documents.length === 0) {
		return (
			<div className="flex h-48 items-center justify-center rounded-md border border-border bg-muted/30">
				<p className="text-muted-foreground">
					No documents found. Create your first document to get started.
				</p>
			</div>
		)
	}

	return (
		<>
			<div className="rounded-md border border-border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted/50">
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Bot</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Content</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
							<th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
						</tr>
					</thead>
					<tbody>
						{documents.map((doc) => (
							<tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/30">
								<td className="px-4 py-3 font-medium">{doc.title}</td>
								<td className="px-4 py-3 text-muted-foreground">{getBotName(doc.botId)}</td>
								<td className="px-4 py-3 text-muted-foreground">
									{doc.content.substring(0, 50)}...
								</td>
								<td className="px-4 py-3 text-muted-foreground">
									{new Date(doc.createdAt).toLocaleDateString()}
								</td>
								<td className="px-4 py-3 text-right">
									<div className="flex items-center justify-end gap-2">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setEditingDocument(doc)}
										>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(doc.id)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{editingDocument && (
				<DocumentForm
					open={!!editingDocument}
					onClose={() => setEditingDocument(null)}
					document={editingDocument}
					bots={bots}
				/>
			)}
		</>
	)
}
