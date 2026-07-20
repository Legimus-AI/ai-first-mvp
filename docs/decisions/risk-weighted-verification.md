# Risk-Weighted Verification

Status: Accepted — supersedes the per-slice contract and test-matrix portions of
`verifier-first-strategy.md`.

## Decision

Verification effort follows failure risk, not test count:

- Keep one DB-free global OpenAPI contract suite and global architecture guards.
- Generate one executable real-app CRUD lifecycle covering authentication, every exposed
  operation, persistence, tenant isolation, and post-delete behavior.
- Add focused tests only for distinct business rules, security boundaries, recovery
  paths, and regressions.
- Reject duplicate per-slice contracts, pending tests, hollow smoke tests, and generic
  CRUD matrices.

`pnpm test:software` is the default DB-free pre-push lane. Developers can opt into the
full local suite with `RUN_PREPUSH_TESTS=1 TEST_DATABASE_URL=... git push`; CI always
runs both lanes. Database-backed tests fail closed when the explicit disposable test
database URL is absent.

## Consequences

Agents search a smaller, higher-signal suite. Generated verification fails on missing
behavior instead of reporting pending tests as progress. Database-backed tests remain
authoritative for persistence and isolation, while static/global checks provide fast
architectural feedback.
