import { GoogleGenerativeAI } from '@google/generative-ai'

let _genAI: GoogleGenerativeAI | null = null

export function initGemini(apiKey: string): void {
	_genAI = new GoogleGenerativeAI(apiKey)
}

export interface ChatContext {
	systemPrompt: string
	documents: string[]
	history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
	userMessage: string
	model?: string
}

export async function generateChatResponse(ctx: ChatContext): Promise<string> {
	if (!_genAI) throw new Error('Gemini not initialized. Call initGemini() first.')

	const model = _genAI.getGenerativeModel({ model: ctx.model || 'gemini-2.0-flash' })

	const docsContext =
		ctx.documents.length > 0 ? `\n\nKnowledge base:\n${ctx.documents.join('\n---\n')}` : ''

	const chat = model.startChat({
		history: ctx.history,
		systemInstruction: ctx.systemPrompt + docsContext,
	})

	const result = await chat.sendMessage(ctx.userMessage)
	return result.response.text()
}
