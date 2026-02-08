# Learnings — AI First MVP Battle Test

> Issues, gaps, and improvements discovered while building a real MVP on top of ai-first-skeleton + AI First Architecture v2.0.0

## Skeleton Gaps (ai-first-skeleton)

### 1. Missing `hono` in shared package dependencies
- **Problem:** `packages/shared` uses `import { z } from '@hono/zod-openapi'` for `.openapi()` metadata, but `@hono/zod-openapi` has `hono` as a peer dependency. pnpm's strict resolution means TypeScript can't resolve the full type chain without `hono` installed in the shared package.
- **Symptom:** `Property 'openapi' does not exist on type 'ZodString'` — 60+ errors in all schema files.
- **Fix:** Add `hono` as a dependency in `packages/shared/package.json`.
- **Skeleton action:** Add `hono` to shared package dependencies.

### 2. OpenAPIHono route definitions conflict with global error handler
- **Problem:** When `createRoute()` defines both success (200) and error (404, 401) responses, OpenAPIHono's strict typing expects the handler to potentially return ANY of those status codes. But our architecture throws `AppError` and the global error handler in `app.ts` catches it — the handler itself only ever returns the success status.
- **Symptom:** `Type '404 | 200' is not assignable to type '200'` on every route handler that declares error responses.
- **Fix:** Remove non-success responses from `createRoute()` definitions. Error responses are produced by the global handler, not by individual route handlers.
- **Trade-off:** OpenAPI spec won't document error responses per-endpoint. Acceptable for MVP. For production, consider a shared error schema decorator or a custom OpenAPI post-processor.
- **Skeleton action:** Document this pattern in AGENTS.md route examples. Only declare success responses in `createRoute()`. Add a note about the global error handler producing 4xx/5xx.

### 3. Hono RPC type inference across workspace packages
- **Problem:** The web frontend imports `AppType` from the API package for type-safe Hono RPC calls (`hc<AppType>`). But TypeScript's `moduleResolution: "bundler"` with pnpm workspaces can't properly resolve the complex generic types that OpenAPIHono's route chaining produces.
- **Symptom:** `api` is of type `unknown` in all hooks and components that use the RPC client.
- **Workaround:** Used `as any` cast on the RPC client. Runtime works correctly; Zod validates responses.
- **Skeleton action:** Investigate TypeScript project references with `composite: true`, or build API types to `.d.ts` for consumption. This is a known limitation of the current architecture.

### 4. Stale test files after slice removal
- **Problem:** After removing the `todos` slice and adding new slices, the old `schemas.test.ts` still imported from `../slices/todos/schemas`.
- **Skeleton action:** The `generate:slice` command should NOT leave test stubs referencing old slices. Consider a `remove:slice` command or at minimum document that tests must be updated when slices change.

### 5. No `@types/node` for process.env in Bun
- **Problem:** Auth routes use `process.env.JWT_SECRET`. Bun supports `process.env` but TypeScript needs `@types/node` or a global declaration.
- **Skeleton action:** Either include `@types/node` in devDependencies or add a minimal `global.d.ts` declaring `process.env`.

## Architecture Spec Gaps (ai-first-architecture v2.0.0)

### 6. No guidance on error response documentation in OpenAPI
- **Problem:** Spec says "use OpenAPIHono + createRoute()" (R13) and "global error handler" but doesn't address the tension between documenting error responses in OpenAPI and the type conflict this creates.
- **Spec action:** Add a note to R13 explaining that error responses should NOT be in `createRoute()` when using a global error handler pattern.

### 7. No Redis recipe in spec
- **Problem:** Spec mentions "recipes" for things like vector search but doesn't have a Redis recipe for stateless session management. This was needed for the chat widget's conversation context.
- **Spec action:** Add a Redis recipe for session/cache management. Pattern: init in `main.ts`, module-level client in `lib/redis.ts`, cache helpers as pure functions.

### 8. No guidance on AI SDK integration
- **Problem:** Integrating Gemini (or any AI SDK) required creating `lib/gemini.ts` with init + chat functions. The spec doesn't address where AI SDK initialization belongs in the architecture.
- **Spec action:** Add guidance: AI SDK clients follow the same pattern as DB/Redis — init in `main.ts`, module-level client in `lib/<provider>.ts`, service functions that use it are pure (receive the client or use the module-level one).

### 9. Date serialization mismatch (Drizzle Date → Zod string)
- **Problem:** Drizzle returns JavaScript `Date` objects from PostgreSQL `timestamp` columns. Zod schemas define dates as `z.string().datetime()`. Every service function needs `.toISOString()` conversion on all date fields.
- **Symptom:** Runtime errors or type mismatches if services forget to convert.
- **Fix:** Added `.toISOString()` in every service that returns data.
- **Skeleton action:** Consider a shared helper `serializeDates()` or a Drizzle custom type that auto-converts. Or change the DB schema to store ISO strings. Document the pattern either way.

### 10. jsonb columns need explicit type casting
- **Problem:** Drizzle's `jsonb()` column returns `unknown` type. Zod schema expects `Record<string, unknown> | null`. Need explicit casts in services.
- **Skeleton action:** Document the jsonb type casting pattern. Consider a Drizzle custom type that narrows the return type.

### 11. Public vs authenticated routes pattern undocumented
- **Problem:** The MVP needed both authenticated (admin panel) and public (chat widget) routes. The auth middleware exclude pattern (`exclude: ['/health', '/api/chat', '/api/auth']`) works but isn't documented in the skeleton.
- **Skeleton action:** Document the auth exclude pattern. Show how to have mixed public/private routes.

## DX Issues

### 12. TanStack Router route tree generation
- **Problem:** Route tree (`routeTree.gen.ts`) must be auto-generated before TypeScript can validate route paths. New developers get confusing errors if they haven't run `dev` first.
- **Skeleton action:** Add a `pnpm generate:routes` script and mention it in AGENTS.md quick start.

### 13. Docker Compose slow startup with OrbStack
- **Problem:** Docker commands can hang for 30+ seconds when OrbStack is starting up. No timeout feedback.
- **Skeleton action:** Add a health-check wait script in package.json: `pnpm db:wait` that retries until PG is ready.

## Positive Validations

- ✅ Boundary Slices pattern scales cleanly from 1 to 6 slices
- ✅ Schema-First (Zod) works well — single source of truth for API + frontend
- ✅ Functional Core + Imperative Shell — services are pure, main.ts is the only shell
- ✅ Bun runtime works smoothly with all dependencies (bcryptjs, ioredis, @google/generative-ai)
- ✅ OpenAPIHono auto-generates correct OpenAPI spec + Swagger UI
- ✅ UUIDv7 primary keys work with native PG18 `uuidv7()` function
- ✅ LogTape structured logging is truly cross-runtime and zero-config in tests
- ✅ Biome lint/format works perfectly across the monorepo
- ✅ pnpm workspaces with Bun runtime = no issues
