#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_SLICE="genvalidation${PPID}${RANDOM}"
OWNERSHIP_TOKEN="generator-validation:${TEST_SLICE}:${PPID}"
OWNERSHIP_SENTINEL=".generator-validation-owner"
VALIDATION_TMP=""
cleanup_validation_tmp() {
	if [ -n "$VALIDATION_TMP" ] && [ -d "$VALIDATION_TMP" ]; then
		rm -rf -- "$VALIDATION_TMP"
	fi
}
trap cleanup_validation_tmp EXIT
VALIDATION_TMP=$(mktemp -d "${TMPDIR:-/tmp}/generator-validation.XXXXXX")
NAV_FILE="$ROOT/apps/web/src/layouts/nav-items.ts"
ROUTE_TREE_FILE="$ROOT/apps/web/src/routeTree.gen.ts"
NAV_BACKUP=""
ROUTE_TREE_BACKUP=""
GENERATOR_STARTED=false

cleanup_owned_directory() {
	local owned_directory="$1"
	local sentinel="$owned_directory/$OWNERSHIP_SENTINEL"
	if [ -f "$sentinel" ] && [ "$(cat "$sentinel")" = "$OWNERSHIP_TOKEN" ]; then
		rm -rf "$owned_directory"
	fi
}

cleanup() {
	if [ "$GENERATOR_STARTED" = true ]; then
		for partial_directory in \
			"$ROOT/packages/shared/src/slices/$TEST_SLICE" \
			"$ROOT/apps/api/src/slices/$TEST_SLICE" \
			"$ROOT/apps/web/src/slices/$TEST_SLICE"; do
			if [ -d "$partial_directory" ] && [ ! -e "$partial_directory/$OWNERSHIP_SENTINEL" ]; then
				printf '%s\n' "$OWNERSHIP_TOKEN" > "$partial_directory/$OWNERSHIP_SENTINEL"
			fi
		done
		local partial_route="$ROOT/apps/web/src/routes/_authed/$TEST_SLICE.tsx"
		if [ -f "$partial_route" ] && [ ! -e "${partial_route}.${OWNERSHIP_SENTINEL}" ]; then
			printf '%s\n' "$OWNERSHIP_TOKEN" > "${partial_route}.${OWNERSHIP_SENTINEL}"
		fi
	fi
	cleanup_owned_directory "$ROOT/packages/shared/src/slices/$TEST_SLICE"
	cleanup_owned_directory "$ROOT/apps/api/src/slices/$TEST_SLICE"
	cleanup_owned_directory "$ROOT/apps/web/src/slices/$TEST_SLICE"
	local route_file="$ROOT/apps/web/src/routes/_authed/$TEST_SLICE.tsx"
	local route_sentinel="${route_file}.${OWNERSHIP_SENTINEL}"
	if [ -f "$route_sentinel" ] && [ "$(cat "$route_sentinel")" = "$OWNERSHIP_TOKEN" ]; then
		rm -f "$route_file" "$route_sentinel"
	fi
	if [ -n "$NAV_BACKUP" ]; then
		cp "$NAV_BACKUP" "$NAV_FILE"
	fi
	if [ -n "$ROUTE_TREE_BACKUP" ]; then
		cp "$ROUTE_TREE_BACKUP" "$ROUTE_TREE_FILE"
	fi
	rm -rf "$VALIDATION_TMP"
}

for target in \
	"$ROOT/packages/shared/src/slices/$TEST_SLICE" \
	"$ROOT/apps/api/src/slices/$TEST_SLICE" \
	"$ROOT/apps/web/src/slices/$TEST_SLICE" \
	"$ROOT/apps/web/src/routes/_authed/$TEST_SLICE.tsx"; do
	if [ -e "$target" ]; then
		echo "ERROR: Refusing to validate over pre-existing path: $target"
		rm -rf "$VALIDATION_TMP"
		exit 1
	fi
done

if [ -f "$NAV_FILE" ]; then
	NAV_BACKUP="$VALIDATION_TMP/nav-items.ts"
	cp "$NAV_FILE" "$NAV_BACKUP"
fi
if [ -f "$ROUTE_TREE_FILE" ]; then
	ROUTE_TREE_BACKUP="$VALIDATION_TMP/routeTree.gen.ts"
	cp "$ROUTE_TREE_FILE" "$ROUTE_TREE_BACKUP"
fi

echo "Validating generator output without database access..."
trap cleanup EXIT
GENERATOR_STARTED=true
set +e
"$ROOT/scripts/generate-slice.sh" "$TEST_SLICE"
GENERATOR_EXIT_CODE=$?
set -e

for owned_directory in \
	"$ROOT/packages/shared/src/slices/$TEST_SLICE" \
	"$ROOT/apps/api/src/slices/$TEST_SLICE" \
	"$ROOT/apps/web/src/slices/$TEST_SLICE"; do
	if [ -d "$owned_directory" ]; then
		printf '%s\n' "$OWNERSHIP_TOKEN" > "$owned_directory/$OWNERSHIP_SENTINEL"
	fi
done
generated_route="$ROOT/apps/web/src/routes/_authed/$TEST_SLICE.tsx"
if [ -f "$generated_route" ]; then
	printf '%s\n' "$OWNERSHIP_TOKEN" > "${generated_route}.${OWNERSHIP_SENTINEL}"
fi
if [ "$GENERATOR_EXIT_CODE" -ne 0 ]; then
	exit "$GENERATOR_EXIT_CODE"
fi

ERRORS=0
check_pattern() {
	local file="$1" pattern="$2" label="$3"
	if ! grep -q "$pattern" "$file" 2>/dev/null; then
		echo "FAIL: $label — '$pattern' missing from $(basename "$file")"
		ERRORS=$((ERRORS + 1))
	fi
}

SCHEMAS="$ROOT/packages/shared/src/slices/$TEST_SLICE/schemas.ts"
ROUTES="$ROOT/apps/api/src/slices/$TEST_SLICE/routes.ts"
SERVICE="$ROOT/apps/api/src/slices/$TEST_SLICE/service.ts"
HOOKS="$ROOT/apps/web/src/slices/$TEST_SLICE/hooks/use-${TEST_SLICE}.ts"
COMPONENT="$ROOT/apps/web/src/slices/$TEST_SLICE/components/${TEST_SLICE}-list.tsx"
TESTS="$ROOT/apps/api/src/slices/$TEST_SLICE/__tests__/routes.test.ts"

if ! pnpm exec biome check \
	"$ROOT/packages/shared/src/slices/$TEST_SLICE" \
	"$ROOT/apps/api/src/slices/$TEST_SLICE" \
	"$ROOT/apps/web/src/slices/$TEST_SLICE"; then
	echo "FAIL: generated output does not pass Biome"
	ERRORS=$((ERRORS + 1))
fi

check_pattern "$SCHEMAS" "@hono/zod-openapi" "schemas use the Zod source of truth"
check_pattern "$SCHEMAS" "z.infer<typeof" "schemas infer TypeScript types"
check_pattern "$SCHEMAS" "paginationMetaSchema" "schemas expose pagination"

check_pattern "$ROUTES" "OpenAPIHono" "routes use OpenAPIHono"
check_pattern "$ROUTES" "createRoute" "routes declare typed contracts"
check_pattern "$ROUTES" "AUTH_ERRORS" "routes document auth errors"
check_pattern "$ROUTES" "listQuerySchema" "routes accept pagination"
check_pattern "$ROUTES" "path: '/bulk'" "routes expose bulk delete"

check_pattern "$SERVICE" "../../db/client" "service receives the DB boundary"
check_pattern "$SERVICE" "@repo/shared" "service uses shared types"
check_pattern "$SERVICE" "ListQuery" "service accepts list query"
check_pattern "$SERVICE" "AppError" "service uses structured errors"
check_pattern "$SERVICE" "bulkDelete" "service exposes bulk delete"

check_pattern "$HOOKS" "@/lib/api-client" "hooks use the typed API client"
check_pattern "$HOOKS" "throwIfNotOk" "hooks preserve API errors"
check_pattern "$HOOKS" "useQuery" "hooks query through TanStack Query"
check_pattern "$HOOKS" "useMutation" "hooks mutate through TanStack Query"
check_pattern "$COMPONENT" "text-muted-foreground" "component uses theme tokens"

check_pattern "$TESTS" "createApp" "verifier uses the real app"
check_pattern "$TESTS" "app.request" "verifier crosses the HTTP boundary"
check_pattern "$TESTS" "createdIds" "verifier tracks only records it created"
check_pattern "$TESTS" "inArray" "verifier cleanup uses scoped DB predicates"
check_pattern "$TESTS" "persists the exposed CRUD lifecycle" "verifier is one coherent lifecycle"
check_pattern "$TESTS" "TEST_DATABASE_URL" "verifier requires an explicit test DB"
check_pattern "$TESTS" "toBe(401)" "verifier covers authentication"
check_pattern "$TESTS" "otherTenantAuthorization" "verifier covers tenant isolation"
check_pattern "$TESTS" "method: 'POST'" "verifier covers create"
check_pattern "$TESTS" "method: 'PATCH'" "verifier covers update"
check_pattern "$TESTS" "/bulk" "verifier covers bulk delete"
check_pattern "$TESTS" "method: 'DELETE'" "verifier covers delete"
check_pattern "$TESTS" "getDeletedResponse.status" "verifier covers post-delete reads"

if grep -Eq '((it|test)[.](todo|skip)|describe[.]skip)[[:space:]]*[(]' "$TESTS"; then
	echo "FAIL: generated verifier contains pending or skipped tests"
	ERRORS=$((ERRORS + 1))
fi

for obsolete in routes.contract.test.ts routes.integration.test.ts; do
	if [ -e "$ROOT/apps/api/src/slices/$TEST_SLICE/__tests__/$obsolete" ]; then
		echo "FAIL: obsolete generated verifier exists: $obsolete"
		ERRORS=$((ERRORS + 1))
	fi
done

for file in "$SCHEMAS" "$ROUTES" "$SERVICE" "$HOOKS" "$COMPONENT" "$TESTS"; do
	if [ ! -f "$file" ]; then
		echo "FAIL: missing generated file: $file"
		ERRORS=$((ERRORS + 1))
	fi
done

if [ "$ERRORS" -gt 0 ]; then
	echo "FAILED: $ERRORS generator invariant(s) missing."
	exit 1
fi

echo "OK: generator emits one risk-bearing real-app lifecycle."
if grep -Eq 'deleteMany\(\{\}\)|DELETE FROM (sessions|api_keys|users|organizations)|getDb\(\)\.delete\([^)]*\)[[:space:]]*$' "$ROOT/scripts/generate-slice.sh"; then
	echo "FAIL: Generated DB cleanup must be scoped to records owned by the test"
	ERRORS=$((ERRORS + 1))
fi
