# AI First MVP — GenAI Bots for E-commerce

> Real-world MVP built on [`ai-first-skeleton`](https://github.com/Legimus-AI/ai-first-skeleton) to battle-test the [AI First Architecture](https://github.com/Legimus-AI/ai-first-architecture) v2.0.0 spec.

## What is this

A fully functional admin panel for managing SaaS GenAI chatbots for e-commerce:
- **Bots** — Create and configure AI bots with custom system prompts
- **Documents** — Upload knowledge base documents for RAG context
- **Leads** — Capture visitor leads from chat interactions
- **Widget** — Embeddable chat widget powered by Gemini AI
- **Auth** — JWT-based authentication with role-based access (admin/user)
- **Sessions** — Redis-backed conversation context, stateless across workers

## Architecture

Built with Boundary Slices + Schema-First contracts. Every slice owns its Zod schema, API routes, service logic, and UI components.

```
packages/shared/     → Zod schemas (SINGLE SOURCE OF TRUTH)
apps/api/            → Hono backend (Bun) — 6 slices
apps/web/            → React frontend (Vite) — Admin panel + Widget
```

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime (API) | Bun |
| Framework | Hono + OpenAPIHono |
| ORM | Drizzle + PostgreSQL 18 |
| Cache/Sessions | Redis 7 |
| AI | Google Gemini (via @google/generative-ai) |
| Auth | JWT (HS256) + bcryptjs |
| Frontend | React 19 + Vite + TanStack Router + TanStack Query |
| Styles | Tailwind CSS v4 + CVA |
| Testing | Vitest + Playwright |

## Prerequisites

- **pnpm** (9.x)
- **Bun** (1.x)
- **Docker** (OrbStack/Docker Desktop — for PostgreSQL + Redis)

## Quick Start

```bash
# 1. Clone and install
pnpm install

# 2. Start PostgreSQL + Redis
docker compose up -d

# 3. Copy env
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# 4. Run migrations + seed
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# 5. Start dev servers
pnpm dev
# API: http://localhost:3001
# Web: http://localhost:5174
# Swagger: http://localhost:3001/ui
# Widget: http://localhost:5174/widget/<botId>
```

## Default credentials (seed data)

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | admin |
| user@example.com | user123 | user |

## API Endpoints

| Path | Description |
|------|-------------|
| POST /api/auth/register | Register new user |
| POST /api/auth/login | Login, get JWT |
| GET /api/auth/me | Current user |
| /api/users | Users CRUD (admin) |
| /api/bots | Bots CRUD |
| /api/documents | Documents CRUD |
| /api/leads | Leads list/delete |
| /api/conversations | Conversation history (admin) |
| POST /api/chat/:botId | Chat with bot (public, widget) |
| /doc | OpenAPI 3.0 spec |
| /ui | Swagger UI |

## Scalability Design

- **Stateless API** — All session context in Redis, any worker handles any request
- **Redis-backed sessions** — Conversation context cached with TTL, DB as fallback
- **Horizontal scaling** — No in-memory state. Run 3+ workers safely
- **UUIDv7 primary keys** — Time-sortable, great B-tree performance

## Purpose

This MVP validates:
1. Boundary Slices scale from 1 slice (skeleton) to 6+ slices
2. Schema-First contracts work for complex domain models
3. Redis integration fits naturally in the Imperative Shell
4. OpenAPIHono handles real-world route complexity
5. The skeleton's patterns are sufficient for a production-like app
