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
check_pattern "$ROUTES" "errorResponseSchema" "routes: error response schema"
check_pattern "$ROUTES" "AppError" "routes: uses AppError for errors"
check_pattern "$ROUTES" "listQuerySchema" "routes: uses listQuerySchema for pagination"

# --- Service: must use correct imports + pagination ---
check_pattern "$SERVICE" "../../db/client" "service: DB client import"
check_pattern "$SERVICE" "@repo/shared" "service: types from @repo/shared"
check_pattern "$SERVICE" "ListQuery" "service: uses ListQuery type"
check_pattern "$SERVICE" "buildPaginationMeta" "service: uses buildPaginationMeta"

# --- Hooks: must use Hono RPC + TanStack Query + error handling ---
check_pattern "$HOOKS" "@/lib/api-client" "hooks: api-client import"
check_pattern "$HOOKS" "throwIfNotOk" "hooks: uses throwIfNotOk error parser"
check_pattern "$HOOKS" "useQuery" "hooks: useQuery"
check_pattern "$HOOKS" "useMutation" "hooks: useMutation"
check_pattern "$HOOKS" "useQueryClient" "hooks: useQueryClient"
check_pattern "$HOOKS" '\$get' "hooks: Hono RPC \$get call"
check_pattern "$HOOKS" "ListQuery" "hooks: uses ListQuery type for params"

# --- Component: must use hooks + theme tokens ---
check_pattern "$COMPONENT" "use-${TEST_SLICE}" "component: imports hook"
check_pattern "$COMPONENT" "text-muted-foreground" "component: uses theme tokens"
check_pattern "$COMPONENT" "text-destructive" "component: uses destructive token for errors"

TESTS="$ROOT/apps/api/src/slices/$TEST_SLICE/__tests__/routes.test.ts"

# --- Tests: must exist and use correct patterns ---
check_pattern "$TESTS" "vitest" "tests: vitest imports"
check_pattern "$TESTS" "createApp" "tests: imports createApp"
check_pattern "$TESTS" "app.request" "tests: uses app.request() for HTTP tests"
check_pattern "$TESTS" "NOT_FOUND" "tests: checks NOT_FOUND error code"

# --- All files must exist ---
for f in "$SCHEMAS" "$ROUTES" "$SERVICE" "$HOOKS" "$COMPONENT" "$TESTS"; do
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
