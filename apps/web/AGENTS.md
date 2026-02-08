# Web Frontend — Agent Guidelines

React 19 SPA with Vite, TanStack Router, TanStack Query, and Tailwind CSS.

## Commands

| Task | Command |
|------|---------|
| Dev | `pnpm dev` |
| Build | `pnpm build` |
| Test | `pnpm test` |
| Type check | `pnpm typecheck` |

## Rules

- **Functional components only.** No class components.
- Use TanStack Query for all server state (no local state for API data)
- Use Hono RPC client (`hc<AppType>`) for type-safe API calls
- Import types from `@repo/shared` for forms (React Hook Form + Zod)
- Tailwind CSS only — no CSS files, no CSS-in-JS
- Use CVA (`class-variance-authority`) for component variants
- Use `cn()` helper (`clsx` + `tailwind-merge`) for conditional classes

## Slice structure

```
src/slices/<name>/
├── components/    ← React components (PascalCase files)
├── hooks/         ← TanStack Query hooks (use-*.ts)
└── routes.ts      ← TanStack Router route (if slice has its own page)
```

## Routing

- File-based routing via TanStack Router + Vite plugin
- Route files in `src/routes/`
- `routeTree.gen.ts` is auto-generated — do NOT edit manually
- Add to `.gitignore`: `routeTree.gen.ts`

## API calls

```ts
// Type-safe via Hono RPC — types flow from backend routes
import { api } from '@/lib/api-client'
const res = await api.api.todos.$get()
```

## Theming system

OKLCH color tokens in `src/styles.css` — shadcn/ui pattern with Tailwind v4 `@theme inline`.

**Never use hardcoded colors.** Always use theme tokens:

| Instead of | Use |
|------------|-----|
| `text-gray-500` | `text-muted-foreground` |
| `text-red-500` | `text-destructive` |
| `bg-white` | `bg-background` |
| `bg-gray-100` | `bg-muted` |
| `border-gray-200` | `border-border` |

Available tokens: `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`.

Dark mode: add class `dark` to root element — all tokens auto-switch.

## UI primitives

Reusable components in `src/ui/` (shadcn/ui copy-paste pattern — we OWN these):

| Component | File | Notes |
|-----------|------|-------|
| Button | `button.tsx` | CVA variants: default, destructive, outline, secondary, ghost, link |
| Input | `input.tsx` | Styled with theme tokens |
| Card | `card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| Badge | `badge.tsx` | CVA variants: default, secondary, destructive, outline |
| Skeleton | `skeleton.tsx` | Loading placeholder |
| Separator | `separator.tsx` | Horizontal/vertical divider |
| Sonner | `sonner.tsx` | Toast notifications (via `sonner` library) |

Use `cn()` from `src/lib/utils.ts` to merge classes: `cn('base-class', conditional && 'active-class')`.

## Error handling

All API errors are typed and structured:

```typescript
import { throwIfNotOk } from '@/lib/api-error'

const res = await api.api.todos.$get()
await throwIfNotOk(res) // throws { code, message, requestId }
```

Error codes from `@repo/shared`: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

For granular error handling:

```typescript
import { parseApiError } from '@/lib/api-error'

const error = await parseApiError(res) // { code, message, requestId? }
if (error.code === 'NOT_FOUND') { /* handle */ }
```

## Pagination

List hooks accept optional `ListQuery` params:

```typescript
import { useTodos } from '@/slices/todos/hooks/use-todos'

// Default: page 1, limit 20
const { data } = useTodos()

// With filters
const { data } = useTodos({ page: 2, search: 'buy', sort: 'createdAt', order: 'desc' })

// Access metadata
data?.meta.total      // total items
data?.meta.totalPages // total pages
data?.meta.hasMore    // more pages available
```

## Do NOT

- Import from `@repo/api` at runtime (only `import type` for AppType)
- Create CSS files — use Tailwind classes
- Use `useEffect` for data fetching — use TanStack Query
- Edit `routeTree.gen.ts` — it's auto-generated
- Use hardcoded colors (`text-gray-*`, `bg-white`) — use theme tokens
- Use raw `fetch()` — use Hono RPC client (`api.api.slice.$method()`)
