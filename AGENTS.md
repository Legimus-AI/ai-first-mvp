# AI First Skeleton — Agent Guidelines

> Canonical instructions for ALL AI coding agents (Codex, Gemini CLI, Cursor, Windsurf, Copilot, etc.)

## Architecture

Read `ARCHITECTURE.md` FIRST for the full architecture overview.

**Pattern:** Boundary Slices — each slice owns its schema, routes, service, and UI components.
**Paradigm:** Functional Core + Imperative Shell.
**Schema source of truth:** `packages/shared/src/slices/<name>/schemas.ts` (Zod).

## Monorepo Structure

```
packages/shared/     → Zod schemas (SINGLE SOURCE OF TRUTH)
apps/api/            → Hono backend (runs on Bun)
apps/web/            → React frontend (runs on Vite)
```

## Commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Dev (all) | `pnpm dev` |
| Dev API only | `pnpm dev:api` |
| Dev Web only | `pnpm dev:web` |
| Lint | `pnpm lint` |
| Lint + fix | `pnpm lint:fix` |
| Test (unit+integration) | `pnpm test` |
| Test (E2E) | `pnpm test:e2e` |
| Type check | `pnpm typecheck` |
| DB migrations | `pnpm db:generate && pnpm db:migrate` |
| DB seed | `pnpm db:seed` |
| Start PostgreSQL | `docker compose up -d` |
| Generate new slice | `pnpm generate:slice <name>` |
| OpenAPI spec (JSON) | `http://localhost:3000/doc` |
| Swagger UI | `http://localhost:3000/ui` |
| Install git hooks | `pnpm lefthook install` |
| Verify all guardrails | `pnpm verify` |

## Conventions

### Adding a new slice

**Full workflow:** See [`docs/workflows/add-slice.md`](docs/workflows/add-slice.md) for the complete step-by-step guide with Definition of Done.

Run `pnpm generate:slice <name>` to scaffold, then:

1. Edit Zod schemas in `packages/shared/src/slices/<name>/schemas.ts`
2. Export from `packages/shared/src/index.ts`
3. Add Drizzle table in `apps/api/src/db/schema.ts`
4. Implement `apps/api/src/slices/<name>/service.ts`
5. Implement `apps/api/src/slices/<name>/routes.ts` using `OpenAPIHono` + `createRoute()`
6. Register routes in `apps/api/src/app.ts` via `app.route()`
7. Wire hooks in `apps/web/src/slices/<name>/hooks/`
8. Build UI in `apps/web/src/slices/<name>/components/`
9. Run `pnpm db:generate && pnpm db:migrate`
10. Complete tests in `apps/api/src/slices/<name>/__tests__/routes.test.ts`
11. Run `pnpm verify` to validate everything

### Rules

- **Read `INVARIANTS.md`** before making changes — these rules must never be broken
- **Schema-first:** Change the Zod schema first, then everything else follows
- **No `any`:** Use Zod inference (`z.infer<typeof schema>`) for all types
- **Functional core:** Services are pure functions. No side effects in business logic.
- **Imperative shell:** Only `main.ts` may use runtime-specific APIs (no `Bun.*`/`Deno.*`/`process.*` elsewhere)
- **Slice isolation:** A slice may import from `@repo/shared` and its own slice only
- **Errors:** Throw `AppError.notFound()` etc. in services/routes — global handler catches them
- **Pagination:** All list endpoints accept `ListQuerySchema` and return `{ data, meta }`
- **Testing:** Every CRUD slice has contract tests + integration tests. See `apps/api/AGENTS.md` for the CRUD Test Matrix.
- **Tailwind only:** No CSS files. Use Tailwind theme tokens (not hardcoded colors). CVA for variants.
- **UI primitives:** Reusable components live in `apps/web/src/ui/` (shadcn/ui pattern, copy-paste owned)
- **v0 for UI generation:** Use [v0.dev](https://v0.dev) to generate shadcn/ui components. Always prompt with "React + Vite, NO Next.js, NO server components". Adapt imports from `@/components/ui/` to `@/ui/`.
- **Small files:** Max ~200 lines per file. Split if larger.

### Naming

- Files: `kebab-case.ts` / `kebab-case.tsx`
- Zod schemas: `camelCase` (e.g., `createTodoSchema`)
- Types: `PascalCase` (e.g., `CreateTodo`)
- DB tables: `snake_case` (e.g., `todos`)
- Routes: `/api/<slice-name>` (e.g., `/api/todos`)

### Git

- Branch: `feat/<ticket>-<description>` or `fix/<ticket>-<description>`
- Commits: Conventional Commits with slice scope: `feat(todos): add completion toggle`
- Trunk-based: short-lived branches, merge to `main`

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime (API) | Bun |
| Framework (API) | Hono + OpenAPIHono (`@hono/zod-openapi`) |
| ORM | Drizzle + PostgreSQL |
| Validation | Zod |
| API Docs | OpenAPI 3.0 (auto-generated) + Swagger UI |
| Lint/Format | Biome |
| Git Hooks | Lefthook (pre-commit: lint + typecheck) |
| UI Framework | React 19 |
| Build Tool | Vite |
| Routing | TanStack Router |
| Data Fetching | TanStack Query + Hono RPC |
| Styles | Tailwind CSS + CVA |
| Forms | React Hook Form + Zod |
| Testing (unit) | Vitest |
| Testing (E2E) | Playwright |
| Security Scanning | Gitleaks (secrets) + Trivy (vulnerabilities) |
| UI Components | shadcn/ui (copy-paste owned, `src/ui/`) |
