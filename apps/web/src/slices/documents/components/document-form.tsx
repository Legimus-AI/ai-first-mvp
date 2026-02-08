import { Button } from '@/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/ui/dialog'
import { Input } from '@/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { type Bot, type CreateDocument, type Document, createDocumentSchema } from '@repo/shared'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useCreateDocument, useUpdateDocument } from '../hooks/use-documents'

interface DocumentFormProps {
	open: boolean
	onClose: () => void
	document?: Document
	bots: Bot[]
}

export function DocumentForm({ open, onClose, document, bots }: DocumentFormProps) {
	const isEdit = !!document
	const createMutation = useCreateDocument()
	const updateMutation = useUpdateDocument(document?.id ?? '')

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<CreateDocument>({
		resolver: zodResolver(createDocumentSchema),
		defaultValues: document
			? {
					botId: document.botId,
					title: document.title,
					content: document.content,
				}
			: {
					botId: bots[0]?.id ?? '',
					title: '',
					content: '',
				},
	})

	useEffect(() => {
		if (open && document) {
			reset({
				botId: document.botId,
				title: document.title,
				content: document.content,
			})
		} else if (open && !document) {
			reset({
				botId: bots[0]?.id ?? '',
				title: '',
				content: '',
			})
		}
	}, [open, document, bots, reset])

	const onSubmit = async (data: CreateDocument) => {
		if (isEdit) {
			await updateMutation.mutateAsync({ title: data.title, content: data.content })
		} else {
			await createMutation.mutateAsync(data)
		}
		onClose()
	}

	return (
		<Dialog open={open} onClose={onClose}>
			<DialogHeader>
				<DialogTitle>{isEdit ? 'Edit Document' : 'Create Document'}</DialogTitle>
				<DialogClose onClose={onClose} />
			</DialogHeader>
			<form onSubmit={handleSubmit(onSubmit)}>
				<DialogContent>
					<div className="space-y-4">
						{!isEdit && (
							<div className="space-y-2">
								<label htmlFor="botId" className="text-sm font-medium">
									Bot
								</label>
								<select
									id="botId"
									{...register('botId')}
									className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									{bots.map((bot) => (
										<option key={bot.id} value={bot.id}>
											{bot.name}
										</option>
									))}
								</select>
								{errors.botId && <p className="text-sm text-destructive">{errors.botId.message}</p>}
							</div>
						)}

						<div className="space-y-2">
							<label htmlFor="title" className="text-sm font-medium">
								Title
							</label>
							<Input
								id="title"
								{...register('title')}
								error={!!errors.title}
								placeholder="Return Policy"
							/>
							{errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
						</div>

						<div className="space-y-2">
							<label htmlFor="content" className="text-sm font-medium">
								Content
							</label>
							<textarea
								id="content"
								{...register('content')}
								className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								placeholder="Enter the document content here..."
							/>
							{errors.content && (
								<p className="text-sm text-destructive">{errors.content.message}</p>
							)}
						</div>
					</div>
				</DialogContent>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	)
}
