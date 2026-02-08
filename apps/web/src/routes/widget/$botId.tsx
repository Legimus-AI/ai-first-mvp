import { getApiClient } from '@/lib/api-client'
import { throwIfNotOk } from '@/lib/api-error'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import type { Bot, ChatRequest } from '@repo/shared'
import { createFileRoute } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/widget/$botId')({
	component: ChatWidget,
})

interface Message {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: Date
}

function ChatWidget() {
	const { botId } = Route.useParams()
	const [bot, setBot] = useState<Bot | null>(null)
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [senderId, setSenderId] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		let storedSenderId = localStorage.getItem(`widget_sender_${botId}`)
		if (!storedSenderId) {
			storedSenderId = `visitor-${Math.random().toString(36).substring(2, 15)}`
			localStorage.setItem(`widget_sender_${botId}`, storedSenderId)
		}
		setSenderId(storedSenderId)

		const api = getApiClient()
		api.api.bots[':id']
			.$get({ param: { id: botId } })
			.then(async (res: Response) => {
				await throwIfNotOk(res)
				return res.json()
			})
			.then((data: Bot) => {
				setBot(data)
				setMessages([
					{
						id: '0',
						role: 'assistant',
						content: data.welcomeMessage,
						timestamp: new Date(),
					},
				])
			})
			.catch((error: Error) => {
				toast.error('Failed to load bot')
				console.error(error)
			})
	}, [botId])

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	const handleSend = async () => {
		if (!input.trim() || isLoading || !senderId) return

		const userMessage: Message = {
			id: Date.now().toString(),
			role: 'user',
			content: input.trim(),
			timestamp: new Date(),
		}

		setMessages((prev) => [...prev, userMessage])
		setInput('')
		setIsLoading(true)

		try {
			const api = getApiClient()
			const chatData: ChatRequest = {
				senderId,
				message: userMessage.content,
			}

			const res = await api.api.chat[':botId'].$post({
				param: { botId },
				json: chatData,
			})
			await throwIfNotOk(res)
			const response = await res.json()

			const assistantMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: 'assistant',
				content: response.reply,
				timestamp: new Date(),
			}

			setMessages((prev) => [...prev, assistantMessage])
		} catch (error) {
			toast.error('Failed to send message')
			console.error(error)
		} finally {
			setIsLoading(false)
		}
	}

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	if (!bot) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		)
	}

	return (
		<div className="flex h-screen flex-col bg-background">
			<header className="border-b border-border bg-card px-6 py-4">
				<h1 className="text-xl font-semibold">{bot.name}</h1>
				<p className="text-sm text-muted-foreground">Powered by AI</p>
			</header>

			<div className="flex-1 overflow-y-auto p-6">
				<div className="mx-auto max-w-3xl space-y-4">
					{messages.map((message) => (
						<div
							key={message.id}
							className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
						>
							<div
								className={`max-w-[80%] rounded-lg px-4 py-3 ${
									message.role === 'user'
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-foreground'
								}`}
							>
								<p className="whitespace-pre-wrap text-sm">{message.content}</p>
								<span className="mt-1 block text-xs opacity-70">
									{message.timestamp.toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit',
									})}
								</span>
							</div>
						</div>
					))}
					{isLoading && (
						<div className="flex justify-start">
							<div className="rounded-lg bg-muted px-4 py-3">
								<div className="flex space-x-2">
									<div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
									<div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
									<div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
								</div>
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>
			</div>

			<div className="border-t border-border bg-card p-4">
				<div className="mx-auto flex max-w-3xl gap-2">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyPress}
						placeholder="Type your message..."
						disabled={isLoading}
						className="flex-1"
					/>
					<Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
						<Send className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	)
}
