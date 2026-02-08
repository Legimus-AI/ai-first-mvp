# Invariants

> Rules that must NEVER be broken. Violating any of these is a blocking issue.

## Schema

1. **Zod is the single source of truth.** All types are derived via `z.infer<>`. Never define a type manually that duplicates a Zod schema.
2. **Schemas live in `packages/shared` only.** API and Web import from `@repo/shared` — never redefine schemas locally.
3. **Schema changes propagate.** Changing a Zod schema MUST cause a type error in both API routes and Web components if the change is breaking.

## API

4. **Only `main.ts` may use runtime-specific APIs.** All other code is isomorphic (no `Bun.*`, no `Deno.*`, no `process.*`).
5. **Routes are contracts.** Every endpoint uses `createRoute()` with explicit request/response schemas — no untyped handlers.
6. **Services are pure functions.** No side effects, no HTTP context, no runtime-specific APIs in service files.
7. **Structured errors only.** All error responses use `{ error: { code, message } }` format.

## Frontend

8. **No `fetch()` calls.** All API calls go through Hono RPC client (`hc<AppType>`).
9. **No `useEffect` for data fetching.** Use TanStack Query hooks.
10. **No CSS files.** Tailwind classes only, CVA for variants.

## Governance

11. **No `any` types.** Use Zod inference or explicit typing.
12. **Pre-commit hooks must pass.** `pnpm lint` and `pnpm typecheck` run on every commit via Lefthook.
13. **Tests are mandatory for new slices.** Every slice needs route integration tests at minimum.

## Generator

14. **Generator must match reference slice.** `scripts/generate-slice.sh` output must use the same patterns as the `todos` slice (OpenAPIHono, createRoute, @hono/zod-openapi, Hono RPC). Validated by `scripts/validate-generator.sh` in CI.

## Security

15. **No secrets in code.** Environment variables validated at startup via `env.ts`.
16. **Rate limiting on all routes.** The global rate limiter middleware must not be removed.
