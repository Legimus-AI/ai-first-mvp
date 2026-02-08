# Workflow: Add a New Slice

> Step-by-step guide for adding a complete boundary slice (schema + API + UI + tests).
> This is the ONLY supported path for extending the skeleton.

## Prerequisites

- PostgreSQL running: `docker compose up -d`
- Dependencies installed: `pnpm install`
- Migrations up to date: `pnpm db:migrate`

## Steps

### 1. Generate the slice scaffold

```bash
pnpm generate:slice <name>
# Example: pnpm generate:slice products
```

This creates files in all 3 packages: `shared/`, `api/`, `web/` + test stubs.

### 2. Define Zod schemas (source of truth)

Edit `packages/shared/src/slices/<name>/schemas.ts`:
- Add domain fields to the main schema
- Add fields to create/update request schemas
- Export from `packages/shared/src/index.ts`

### 3. Define database table (co-located with slice)

Edit `apps/api/src/slices/<name>/schema.ts` (scaffolded by generator):
- Add domain columns matching your Zod schema fields
- UUIDv7 primary key is already scaffolded: `uuid('id').primaryKey().default(sql\`uuidv7()\`)`

Then re-export from the barrel: add `export * from '../slices/<name>/schema'` to `apps/api/src/db/schema.ts`

Run: `pnpm db:generate && pnpm db:migrate`

### 4. Implement the service

Edit `apps/api/src/slices/<name>/service.ts`:
- Replace TODOs with Drizzle queries
- Use `AppError.notFound()` for missing resources
- Follow the `todos` service as reference

### 5. Register routes

Edit `apps/api/src/app.ts`:
- Import: `import { <name>Routes } from './slices/<name>/routes'`
- Register: `app.route('/api/<name>', <name>Routes)`

### 6. Complete tests

Edit `apps/api/src/slices/<name>/__tests__/routes.test.ts`:
- Update the POST test with required fields
- Add additional tests for your business logic
- Follow `todos/__tests__/routes.test.ts` as reference

### 7. Build the UI

Edit `apps/web/src/slices/<name>/components/<name>-list.tsx`:
- Build your React components using hooks from `hooks/use-<name>.ts`
- Use theme tokens (`text-muted-foreground`, `bg-background`, etc.)
- Use UI primitives from `src/ui/` (Button, Card, Input, etc.)

### 8. Verify everything

```bash
pnpm verify
```

This runs: lint → typecheck → tests → generator validation. **All must pass.**

## Definition of Done

- [ ] Zod schemas defined and exported from `@repo/shared`
- [ ] DB table created with migration
- [ ] Service functions implemented (CRUD + pagination)
- [ ] Routes registered in `app.ts` with OpenAPI contracts
- [ ] Route tests passing (at minimum: list, create, get, 404, delete)
- [ ] UI component renders data with theme tokens
- [ ] `pnpm verify` passes
- [ ] OpenAPI spec at `/doc` includes new endpoints
- [ ] Swagger UI at `/ui` shows new endpoints

## Reference

The `todos` slice is the canonical reference. When in doubt, copy its patterns:
- Schemas: `packages/shared/src/slices/todos/schemas.ts`
- DB Schema: `apps/api/src/slices/todos/schema.ts`
- Service: `apps/api/src/slices/todos/service.ts`
- Routes: `apps/api/src/slices/todos/routes.ts`
- Tests: `apps/api/src/slices/todos/__tests__/routes.test.ts`
- Hooks: `apps/web/src/slices/todos/hooks/use-todos.ts`
- UI: `apps/web/src/slices/todos/components/todo-list.tsx`
