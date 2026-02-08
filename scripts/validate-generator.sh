#!/usr/bin/env bash
# R8 Generator Enforcement — validates generator output matches current patterns
# If this fails, update scripts/generate-slice.sh to match the reference slice (todos).
# Runs in CI to prevent generator drift.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_SLICE="genvalidation"

cleanup() {
	rm -rf \
		"$ROOT/packages/shared/src/slices/$TEST_SLICE" \
		"$ROOT/apps/api/src/slices/$TEST_SLICE" \
		"$ROOT/apps/web/src/slices/$TEST_SLICE" \
		"$ROOT/apps/api/src/slices/$TEST_SLICE"
}
trap cleanup EXIT

echo "Validating generator output..."
"$ROOT/scripts/generate-slice.sh" "$TEST_SLICE"

ERRORS=0

check_pattern() {
	local file="$1" pattern="$2" label="$3"
	if ! grep -q "$pattern" "$file" 2>/dev/null; then
		echo "FAIL: $label — pattern '$pattern' not found in $(basename "$file")"
		ERRORS=$((ERRORS + 1))
	fi
}

SCHEMAS="$ROOT/packages/shared/src/slices/$TEST_SLICE/schemas.ts"
ROUTES="$ROOT/apps/api/src/slices/$TEST_SLICE/routes.ts"
SERVICE="$ROOT/apps/api/src/slices/$TEST_SLICE/service.ts"
HOOKS="$ROOT/apps/web/src/slices/$TEST_SLICE/hooks/use-${TEST_SLICE}.ts"
COMPONENT="$ROOT/apps/web/src/slices/$TEST_SLICE/components/${TEST_SLICE}-list.tsx"

# --- Schemas: must use @hono/zod-openapi + pagination ---
check_pattern "$SCHEMAS" "@hono/zod-openapi" "schemas: @hono/zod-openapi import"
check_pattern "$SCHEMAS" ".openapi(" "schemas: .openapi() metadata"
check_pattern "$SCHEMAS" "z.infer<typeof" "schemas: type inference from Zod"
check_pattern "$SCHEMAS" "paginationMetaSchema" "schemas: pagination meta in list response"

# --- Routes: must use OpenAPIHono + createRoute + AppError ---
check_pattern "$ROUTES" "OpenAPIHono" "routes: OpenAPIHono"
check_pattern "$ROUTES" "createRoute" "routes: createRoute()"
check_pattern "$ROUTES" ".openapi(" "routes: .openapi() handler"
check_pattern "$ROUTES" "@repo/shared" "routes: imports from @repo/shared"
check_pattern "$ROUTES" "errorResponses" "routes: uses errorResponses() helper"
check_pattern "$ROUTES" "AUTH_ERRORS" "routes: uses AUTH_ERRORS for middleware errors"
check_pattern "$ROUTES" "openapi-errors" "routes: imports from openapi-errors"
check_pattern "$ROUTES" "bulkDeleteSchema" "routes: has bulk delete route"
check_pattern "$ROUTES" "listQuerySchema" "routes: uses listQuerySchema for pagination"

# --- Service: must use correct imports + pagination ---
check_pattern "$SERVICE" "../../db/client" "service: DB client import"
check_pattern "$SERVICE" "@repo/shared" "service: types from @repo/shared"
check_pattern "$SERVICE" "ListQuery" "service: uses ListQuery type"
check_pattern "$SERVICE" "buildPaginationMeta" "service: uses buildPaginationMeta"
check_pattern "$SERVICE" "AppError" "service: uses AppError for errors"
check_pattern "$SERVICE" "bulkDelete" "service: has bulkDelete function"

# --- Hooks: must use Hono RPC + TanStack Query + error handling ---
check_pattern "$HOOKS" "@/lib/api-client" "hooks: api-client import"
check_pattern "$HOOKS" "throwIfNotOk" "hooks: uses throwIfNotOk error parser"
check_pattern "$HOOKS" "useQuery" "hooks: useQuery"
check_pattern "$HOOKS" "useMutation" "hooks: useMutation"
check_pattern "$HOOKS" "useQueryClient" "hooks: useQueryClient"
check_pattern "$HOOKS" '\$get' "hooks: Hono RPC \$get call"
check_pattern "$HOOKS" '\$patch' "hooks: Hono RPC \$patch call (not \$put)"
check_pattern "$HOOKS" "BulkDelete" "hooks: has bulk delete hook"
check_pattern "$HOOKS" "ListQuery" "hooks: uses ListQuery type for params"

# --- Component: must use hooks + theme tokens ---
check_pattern "$COMPONENT" "use-${TEST_SLICE}" "component: imports hook"
check_pattern "$COMPONENT" "text-muted-foreground" "component: uses theme tokens"
check_pattern "$COMPONENT" "text-destructive" "component: uses destructive token for errors"

TESTS="$ROOT/apps/api/src/slices/$TEST_SLICE/__tests__/routes.test.ts"
INTEGRATION_TESTS="$ROOT/apps/api/src/slices/$TEST_SLICE/__tests__/routes.integration.test.ts"

# --- Tests: must exist and use correct patterns ---
check_pattern "$TESTS" "vitest" "tests: vitest imports"
check_pattern "$TESTS" "createApp" "tests: imports createApp"
check_pattern "$TESTS" "app.request" "tests: uses app.request() for HTTP tests"
check_pattern "$TESTS" "NOT_FOUND" "tests: checks NOT_FOUND error code"

# --- Integration tests: must exist with CRUD Test Matrix IDs ---
check_pattern "$INTEGRATION_TESTS" "LIST-01" "integration: has LIST-01 test ID"
check_pattern "$INTEGRATION_TESTS" "GET-01" "integration: has GET-01 test ID"
check_pattern "$INTEGRATION_TESTS" "CREATE-01" "integration: has CREATE-01 test ID"
check_pattern "$INTEGRATION_TESTS" "UPDATE-01" "integration: has UPDATE-01 test ID"
check_pattern "$INTEGRATION_TESTS" "DELETE-01" "integration: has DELETE-01 test ID"
check_pattern "$INTEGRATION_TESTS" "BULK-01" "integration: has BULK-01 test ID"
check_pattern "$INTEGRATION_TESTS" "it.todo" "integration: uses it.todo() stubs"
check_pattern "$INTEGRATION_TESTS" "initDb" "integration: imports initDb"
check_pattern "$INTEGRATION_TESTS" "postgresql://mvp:mvp@localhost:5433/mvp" "integration: uses correct test DB URL"

# --- All files must exist ---
for f in "$SCHEMAS" "$ROUTES" "$SERVICE" "$HOOKS" "$COMPONENT" "$TESTS" "$INTEGRATION_TESTS"; do
	if [ ! -f "$f" ]; then
		echo "FAIL: Missing file: $(basename "$f")"
		ERRORS=$((ERRORS + 1))
	fi
done

echo ""
if [ $ERRORS -gt 0 ]; then
	echo "FAILED: $ERRORS pattern(s) missing. Update scripts/generate-slice.sh to match current patterns."
	exit 1
fi

echo "OK: Generator output matches all required patterns."
