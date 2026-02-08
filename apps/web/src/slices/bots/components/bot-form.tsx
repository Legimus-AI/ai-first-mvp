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
import { type Bot, type CreateBot, createBotSchema } from '@repo/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useCreateBot, useUpdateBot } from '../hooks/use-bots'

interface BotFormProps {
	open: boolean
	onClose: () => void
	bot?: Bot
}

export function BotForm({ open, onClose, bot }: BotFormProps) {
	const isEdit = !!bot
	const createMutation = useCreateBot()
	const updateMutation = useUpdateBot(bot?.id ?? '')

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<CreateBot>({
		resolver: zodResolver(createBotSchema),
		defaultValues: bot
			? {
					name: bot.name,
					systemPrompt: bot.systemPrompt,
					model: bot.model,
					welcomeMessage: bot.welcomeMessage,
					isActive: bot.isActive,
				}
			: {
					name: '',
					systemPrompt: '',
					model: 'gemini-2.0-flash',
					welcomeMessage: 'Hi! How can I help you today?',
					isActive: true,
				},
	})

	useEffect(() => {
		if (open && bot) {
			reset({
				name: bot.name,
				systemPrompt: bot.systemPrompt,
				model: bot.model,
				welcomeMessage: bot.welcomeMessage,
				isActive: bot.isActive,
			})
		} else if (open && !bot) {
			reset({
				name: '',
				systemPrompt: '',
				model: 'gemini-2.0-flash',
				welcomeMessage: 'Hi! How can I help you today?',
				isActive: true,
			})
		}
	}, [open, bot, reset])

	const onSubmit = async (data: CreateBot) => {
		if (isEdit) {
			await updateMutation.mutateAsync(data)
		} else {
			await createMutation.mutateAsync(data)
		}
		onClose()
	}

	return (
		<Dialog open={open} onClose={onClose}>
			<DialogHeader>
				<DialogTitle>{isEdit ? 'Edit Bot' : 'Create Bot'}</DialogTitle>
				<DialogClose onClose={onClose} />
			</DialogHeader>
			<form onSubmit={handleSubmit(onSubmit)}>
				<DialogContent>
					<div className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="name" className="text-sm font-medium">
								Name
							</label>
							<Input
								id="name"
								{...register('name')}
								error={!!errors.name}
								placeholder="E-commerce Assistant"
							/>
							{errors.name && (
								<p className="text-sm text-destructive">{errors.name.message}</p>
							)}
						</div>

						<div className="space-y-2">
							<label htmlFor="model" className="text-sm font-medium">
								Model
							</label>
							<Input
								id="model"
								{...register('model')}
								error={!!errors.model}
								placeholder="gemini-2.0-flash"
							/>
							{errors.model && (
								<p className="text-sm text-destructive">{errors.model.message}</p>
							)}
						</div>

						<div className="space-y-2">
							<label htmlFor="systemPrompt" className="text-sm font-medium">
								System Prompt
							</label>
							<textarea
								id="systemPrompt"
								{...register('systemPrompt')}
								className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								placeholder="You are a helpful e-commerce assistant..."
							/>
							{errors.systemPrompt && (
								<p className="text-sm text-destructive">{errors.systemPrompt.message}</p>
							)}
						</div>

						<div className="space-y-2">
							<label htmlFor="welcomeMessage" className="text-sm font-medium">
								Welcome Message
							</label>
							<Input
								id="welcomeMessage"
								{...register('welcomeMessage')}
								error={!!errors.welcomeMessage}
								placeholder="Hi! How can I help you today?"
							/>
							{errors.welcomeMessage && (
								<p className="text-sm text-destructive">{errors.welcomeMessage.message}</p>
							)}
						</div>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="isActive"
								{...register('isActive')}
								className="h-4 w-4 rounded border-input"
							/>
							<label htmlFor="isActive" className="text-sm font-medium">
								Active
							</label>
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
