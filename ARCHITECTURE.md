# Architecture — AI First MVP

> Battle-test of [AI First Architecture](https://github.com/Legimus-AI/ai-first-architecture) v2.0.0

## Overview

SaaS admin panel for GenAI bots for e-commerce. 6 slices implementing the full Boundary Slices pattern.

## 6 Pillars

1. **Boundary Slices** — Each slice is a complete feature: schema + API + UI
2. **Schema-First** — Zod schemas in `packages/shared` are the single source of truth
3. **Verifier-First** — Tests are the first deliverable
4. **Agent-Friendly Feedback** — Grepable errors, `pnpm test`, structured logs
5. **Governance-First** — Biome lint, strict TypeScript, slice isolation, INVARIANTS.md
6. **Persistent Context** — AGENTS.md, CLAUDE.md, ARCHITECTURE.md per directory

## Data Flow

```
packages/shared/src/slices/bots/schemas.ts     ← SOURCE OF TRUTH (Zod)
    │
    ├── apps/api/src/slices/bots/routes.ts     ← OpenAPIHono + createRoute()
    │   └── apps/api/src/slices/bots/service.ts   ← pure business logic
    │
    ├── apps/api/src/app.ts                    ← .doc('/doc') auto-generates OpenAPI 3.0
    │
    └── apps/web/src/slices/bots/              ← imports types, type-safe API calls
        ├── hooks/use-bots.ts                  ← TanStack Query + Hono RPC
        └── components/                        ← React components
```

## Slices

| Slice | Tables | Purpose |
|-------|--------|---------|
| auth | (uses users) | Register, login, JWT |
| users | users | User management with roles |
| bots | bots | Bot configuration |
| documents | documents | Knowledge base per bot |
| leads | leads | Visitor lead capture |
| conversations | conversations, messages | Chat sessions + AI integration |

## Chat Flow (Widget → AI → DB → Redis)

```
Widget POST /api/chat/:botId { senderId, message }
  → Find/create conversation (DB)
  → Load context from Redis (fallback: DB)
  → Load bot config + documents (DB)
  → Call Gemini API (system prompt + docs + history + message)
  → Save messages to DB
  → Cache context in Redis (TTL 1h)
  → Return { reply, conversationId }
```

## Scalability Design

- **Stateless API** — All state in PostgreSQL + Redis. No in-memory state.
- **Redis context cache** — Last 20 messages per conversation, TTL 1 hour
- **Any worker handles any request** — senderId + botId → conversation lookup
- **UUIDv7** — Time-sortable PKs, better B-tree performance

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Redis for sessions | Stateless workers. Any instance serves any request |
| Gemini SDK | Direct API call, no orchestration framework needed |
| bcryptjs | Cross-runtime password hashing (not Bun.password) |
| Public chat routes | Widget doesn't need JWT, uses senderId |
| Documents as text | Simple context injection. Vector search is a recipe, not infra |
