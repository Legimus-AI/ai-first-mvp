# ADR-003: Owned UI Primitives (shadcn/ui)

## Status
Accepted

## Context

AI agents, when building frontends, often:
- Install random UI libraries mid-project (Material-UI, Ant Design, Chakra, etc.) → dependency sprawl
- Use inconsistent button styles across components
- Hardcode colors (`bg-blue-500`, `text-gray-700`) instead of theme tokens
- Use `window.confirm()` for destructive actions (ugly, inconsistent with app style)
- Forget accessibility primitives (focus states, ARIA labels, keyboard nav)

We need:
1. A set of reusable, accessible UI components
2. Consistent theming (light/dark mode)
3. No external UI library dependencies (to prevent AI agents from adding more)
4. Variant management (button styles, badge colors, etc.)

## Decision

### Copy-Paste Owned Components (shadcn/ui Pattern)

1. **UI primitives live in `apps/web/src/ui/`**
   - Components are copied into the codebase, NOT imported from `node_modules`
   - We OWN the code — can modify, extend, and version control
   - Each component is one file (e.g., `button.tsx`, `card.tsx`, `badge.tsx`)

2. **Radix UI for accessibility primitives**
   - Radix provides headless components (AlertDialog, Dropdown, Tooltip, etc.)
   - We style them with Tailwind — Radix handles focus management, ARIA, keyboard nav
   - Zero UI opinions from Radix — we control the look

3. **CVA (Class Variance Authority) for variant management**
   - Define variants in component definition, not as prop-based conditionals
   - Example: `variant: 'default' | 'destructive' | 'outline' | 'ghost'`
   - AI agents can't invent new button styles — variants are explicit

```typescript
// apps/web/src/ui/button.tsx
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)
```

4. **Theme tokens only (no hardcoded colors)**
   - All colors are OKLCH tokens in `apps/web/src/styles.css`
   - Tokens: `background`, `foreground`, `primary`, `muted`, `destructive`, `border`, etc.
   - Dark mode: add `.dark` class to root → all tokens auto-switch
   - Never write `bg-blue-500` or `text-[#E54370]` in components

5. **AlertDialog for destructive actions**
   - Replace `window.confirm()` with `<AlertDialog>` from Radix
   - Consistent with app style, accessible, theme-aware

```tsx
// Delete confirmation
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Component Inventory

| Component | File | Purpose |
|-----------|------|---------|
| Button | `button.tsx` | Variants: default, destructive, outline, ghost, link |
| Input | `input.tsx` | Text input with theme tokens |
| Card | `card.tsx` | Container with header/content/footer |
| Badge | `badge.tsx` | Small label (default, secondary, destructive, outline) |
| Skeleton | `skeleton.tsx` | Loading placeholder |
| Separator | `separator.tsx` | Horizontal/vertical divider |
| Sonner | `sonner.tsx` | Toast notifications (via `sonner` library) |
| AlertDialog | `alert-dialog.tsx` | Confirmation modal (via Radix) |

Additional components can be added via [shadcn/ui CLI](https://ui.shadcn.com) → copy into `src/ui/`.

## Consequences

### What becomes easier

- **No dependency sprawl**: AI agents can't install Material-UI or Ant Design — primitives already exist
- **Consistent UI**: All buttons use `buttonVariants`, all colors use theme tokens
- **Dark mode for free**: OKLCH tokens auto-switch with `.dark` class
- **Accessible by default**: Radix primitives handle focus, ARIA, keyboard nav
- **Explicit variants**: `<Button variant="destructive">` is clearer than `<Button danger red>`

### What becomes harder

- Adding new components requires copying from shadcn/ui (not `npm install`)
- Theme token changes require editing `styles.css` (can't just write `bg-purple-500`)

## Alternatives Considered

### Alternative 1: Material-UI / Ant Design / Chakra
**Rejected**: Heavy dependencies (200KB+), opinionated styles, hard to customize. AI agents add MORE UI libraries when primitives are missing.

### Alternative 2: Tailwind UI (paid component library)
**Rejected**: Not free, not copy-paste owned. Can't version control or modify.

### Alternative 3: Build everything from scratch (no Radix)
**Rejected**: Accessibility is hard. Radix provides focus management, ARIA, keyboard nav out of the box. We only style it.

### Alternative 4: headless-ui (by Tailwind Labs)
**Rejected**: Smaller primitive set than Radix. Radix has better TypeScript support and more components (Tooltip, Popover, etc.).

### Alternative 5: CSS-in-JS (styled-components, emotion)
**Rejected**: Runtime cost, harder to theme, adds build complexity. Tailwind + CVA is simpler and faster.
