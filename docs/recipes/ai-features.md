# Recipe: Add AI Features (Chat, Streaming, Tool-Calling)

> Optional addon for projects that need AI-powered features. NOT part of the skeleton base.
> Uses [Vercel AI SDK](https://ai-sdk.dev) with Hono backend + React SPA frontend.

## Why this is a recipe, not built-in

The skeleton is a starting point for ANY app. AI features are business logic, not infrastructure.
Adding `@ai-sdk/*` dependencies to the base would force every project to carry unused deps.

## Prerequisites

- Working skeleton project (all `pnpm verify` checks pass)
- An AI provider API key (OpenAI, Anthropic, Google, etc.)

## 1. Install dependencies

### Backend (API)

```bash
# From apps/api/
pnpm add ai @ai-sdk/openai
# Or swap provider: @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/mistral
```

### Frontend (Web)

```bash
# From apps/web/
pnpm add @ai-sdk/react
```

## 2. Add env var

Edit `apps/api/src/env.ts` to add your provider key:

```typescript
export const envSchema = z.object({
  // ... existing vars
  OPENAI_API_KEY: z.string().optional(), // or ANTHROPIC_API_KEY, etc.
})
```

## 3. Create a chat route (backend)

Create `apps/api/src/slices/chat/routes.ts`:

```typescript
import { OpenAPIHono } from '@hono/zod-openapi'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const chatRoutes = new OpenAPIHono()

chatRoutes.post('/stream', async (c) => {
  const { messages } = await c.req.json()

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  })

  // AI SDK returns SSE-compatible stream
  return result.toDataStreamResponse()
})
```

Register in `apps/api/src/app.ts`:

```typescript
import { chatRoutes } from './slices/chat/routes'
app.route('/api/chat', chatRoutes)
```

## 4. Use chat hooks (frontend)

In your React component:

```tsx
import { useChat } from '@ai-sdk/react'

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat/stream', // Points to your Hono backend
  })

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">{m.role}</p>
            <p>{m.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask something..."
          className="flex-1 rounded-md border px-3 py-2"
        />
        <button type="submit" disabled={isLoading} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Send
        </button>
      </form>
    </div>
  )
}
```

## 5. Structured object streaming (optional)

For generating typed objects (not just text):

```typescript
// Backend: apps/api/src/slices/chat/routes.ts
import { streamObject } from 'ai'
import { z } from '@hono/zod-openapi'

const recipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
})

chatRoutes.post('/generate-recipe', async (c) => {
  const { prompt } = await c.req.json()
  const result = streamObject({
    model: openai('gpt-4o'),
    schema: recipeSchema,
    prompt,
  })
  return result.toTextStreamResponse()
})
```

```tsx
// Frontend: use useObject hook
import { useObject } from '@ai-sdk/react'

const { object, submit, isLoading } = useObject({
  api: '/api/chat/generate-recipe',
  schema: recipeSchema, // Same Zod schema — shared via @repo/shared
})
```

## Key notes

- **Streaming uses SSE** (Server-Sent Events) — works natively in all browsers
- **Hono compatibility**: Use `result.toDataStreamResponse()` for text streams
- **Provider swapping**: Change `openai('gpt-4o')` to `anthropic('claude-sonnet-4-5-20250929')` etc. — same API
- **Zod schemas can be shared**: Put AI-related schemas in `packages/shared` for type safety across backend and frontend

## Reference

- [AI SDK + Hono cookbook](https://ai-sdk.dev/cookbook/api-servers/hono)
- [AI SDK React hooks docs](https://ai-sdk.dev/docs/introduction)
- [Lee Rob's Hono + AI SDK example](https://github.com/leerob/hono-vercel-ai-sdk)
