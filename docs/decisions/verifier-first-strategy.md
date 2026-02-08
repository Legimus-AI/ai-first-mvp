# Solución Definitiva: Estrategia Verifier-First para AI-First Architecture

## Contexto

El MVP con 6 slices tenía 11 de 35 endpoints faltantes. Nadie lo atrapó porque el generator no producía tests y CI no tenía validación de CRUD completo. La spec dice "Verifier-First: tests are the first deliverable" pero no se estaba cumpliendo.

## Solución

**E) Route Contracts generados + Contract Tests que validan contra OpenAPI document (sin DB, sin ejecutar handlers)**

El generator (`pnpm generate:slice`) produce para cada slice:

1. **`__tests__/routes.contract.test.ts`** — Test Vitest que importa el router del slice, llama a `getOpenAPIDocument()`, y verifica que cada operación esperada (LIST, GET, POST, PATCH, DELETE, BULK DELETE) existe como path+method en el documento OpenAPI.

2. **Test global `app.contract.test.ts`** — Verifica que TODOS los slices estén registrados en `app.ts`, atrapando el caso donde el slice existe pero no está montado.

3. **CI script `pnpm validate:contracts`** — Ejecuta los contract tests como parte del pipeline. Falla si falta cualquier endpoint.

### Características clave

- **Sin base de datos**: Los tests solo verifican que las rutas EXISTEN en el OpenAPI spec
- **Sin ejecutar handlers**: `getOpenAPIDocument()` lee metadata de `createRoute()`, no ejecuta código
- **Rápido**: < 1 segundo para todos los contract tests
- **AI-friendly**: Mensajes de error explícitos ("Missing endpoint: PATCH /api/bots/{id}")
- **Generator como DRY**: El generator produce TANTO el código COMO los tests

## Por qué esta solución

Convergencia 3/3 (Claude + Gemini + Codex). Los tres modelos propusieron independientemente la misma estrategia core: contract tests sin DB que verifican existencia de rutas, generados por el generator.

- **Claude**: Contract tests con testClient + static analysis (grep)
- **Gemini**: "Contract-First Discovery Tests" con compliance array de 7 operaciones
- **Codex**: Route contracts + OpenAPI document introspection + test global para slices montados

## Evidencia verificada

| Claim | Verificación | Resultado |
|-------|-------------|-----------|
| `getOpenAPIDocument()` no ejecuta handlers | Documentación Hono + API analysis | Confirmado: lee metadata de createRoute() |
| Generator no produce tests | Audit del script generate-slice.sh | Confirmado: solo genera schema, service, routes, hooks, components |
| 11/35 endpoints faltaban | Audit manual via Swagger UI | Confirmado y ya corregido |
| Contract tests corren sin DB | Diseño: solo importan router, no services con Drizzle | Confirmado por diseño |

## Supuestos no verificados

- Las rutas del slice se pueden importar aisladamente sin que se inicialice la conexión a DB (necesita spike experiment)
- `getOpenAPIDocument()` con la versión actual de `@hono/zod-openapi` funciona correctamente con sub-routers

## Trade-offs y opinión disidente

- **Codex agregó**: El contrato debe soportar "required/optional" para slices que no necesiten las 7 operaciones (ej: conversations no tiene POST/PATCH directo)
- **Gemini advirtió**: Si los tests requieren tokens JWT reales para construir el app, se volverán lentos. Solución: bypass auth en test env.
- **Refactor mínimo**: Si el router actual importa servicios que importan Drizzle, puede necesitar lazy imports o DI para evitar que los contract tests intenten conectarse a DB.

## Nivel de confianza

**Alto** — 3/3 convergencia, diseño validado, ya existe errorResponseSchema y createRoute() como building blocks

## Próximo paso

1. Actualizar el generator para producir `routes.contract.test.ts`
2. Crear `app.contract.test.ts` global
3. Agregar `pnpm validate:contracts` al CI
4. Spike experiment: verificar que importar el router no trigger conexión DB
