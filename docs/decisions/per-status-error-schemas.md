# Decision Record: Per-Status Error Schemas con z.literal()

## Contexto

Swagger UI mostraba el mismo example para todos los error responses (`VALIDATION_ERROR` + `Resource not found`) porque todos usaban un solo `errorResponseSchema` generico con un enum de 7 valores. Victor pidio que cada status code muestre su error code y message correcto.

## Solucion Definitiva

**Per-status schemas con `z.literal()` + `.openapi('Name')` + factory function.** Cada status code (400, 401, 404, 409, 429, 500) tiene su propio schema nombrado con el error code como literal y un message example especifico.

CED debate: convergencia 3/3 (Claude + Gemini + Codex) + spike experiment verificado.

## Evidencia verificada

| Claim | Verificacion | Resultado |
|-------|-------------|-----------|
| `z.literal()` produce single-value enum | Spike en scratchpad | `"enum": ["NOT_FOUND"]` confirmado |
| Named schemas producen `$ref` | Spike en scratchpad | `$ref: '#/components/schemas/NotFoundError'` |
| Cada status tiene example correcto | OpenAPI JSON del MVP | 400=VALIDATION_ERROR, 401=UNAUTHORIZED, etc. |
| Convergencia 3/3 | Claude + Gemini + Codex | Todos propusieron z.literal per-status |

## Implementacion

```typescript
// apps/api/src/lib/openapi-errors.ts
function buildErrorSchema(config: ErrorConfig, name: string) {
  return z.object({
    error: z.object({
      code: z.literal(config.code),         // single-value enum in OpenAPI
      message: z.string().openapi({ example: config.message }),
      requestId: z.string().uuid().optional(),
    }),
  }).openapi(name)                           // named component: $ref
}

// Pre-built constants: ValidationError, UnauthorizedError, NotFoundError, etc.
// Usage: ...errorResponses(400, 404), ...AUTH_ERRORS
```

## Trade-offs rechazados

- **RFC 9457 (Gemini)** — over-engineering para MVP
- **Schemas en shared (Codex)** — frontend no necesita per-status schemas, solo `errorResponseSchema` generico para parsing
- **Discriminated union (opcion C)** — no aplica a OpenAPI per-status responses, solo a tipos TypeScript

## Prevencion

1. **Generator** produce el patron correcto automaticamente
2. **Validator** (`pnpm validate:generator`) verifica `errorResponses`, `AUTH_ERRORS`, `openapi-errors`
3. **Contract tests** (`pnpm validate:contracts`) verifican que las rutas existan
