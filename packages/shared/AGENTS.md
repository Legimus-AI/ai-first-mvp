# Shared Package — Agent Guidelines

This package contains **Zod schemas** that are the SINGLE SOURCE OF TRUTH for the entire project.

## Rules

- **Only Zod schemas and types here.** No business logic. No API code. No UI code.
- Every slice has: `src/slices/<name>/schemas.ts`
- Export all public schemas from `src/index.ts` (barrel export allowed here per R15)
- Types are always derived from Zod: `type Todo = z.infer<typeof todoSchema>`
- Request/response schemas are separate from domain schemas

## Adding a schema

1. Create `src/slices/<name>/schemas.ts`
2. Define domain schema, request schemas, response schemas
3. Export from `src/index.ts`
4. Run `pnpm typecheck` to verify consumers update

## Error system (`src/errors.ts`)

Centralized error handling used by both API and Web:

- **`AppError`** — Error class with typed codes and HTTP status mapping
- **`errorCodeSchema`** — Zod enum: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`
- **`errorResponseSchema`** — Response shape: `{ error: { code, message, requestId? } }`

Usage in API: `throw AppError.notFound('message')` — global handler catches it.
Usage in Web: `throwIfNotOk(res)` / `parseApiError(res)` — typed error extraction.

## Pagination (`src/pagination.ts`)

Shared schemas for consistent list endpoints:

- **`listQuerySchema`** — Query params: `page`, `limit`, `search`, `sort`, `order`
- **`paginationMetaSchema`** — Response meta: `page`, `limit`, `total`, `totalPages`, `hasMore`
- **`buildPaginationMeta(query, total)`** — Helper to compute meta from query + total count

Both API routes and Web hooks import these for type-safe pagination.

## Do NOT

- Import from `@repo/api` or `@repo/web`
- Add runtime dependencies (except `zod` and `@hono/zod-openapi`)
- Add business logic or validation beyond schema shape
