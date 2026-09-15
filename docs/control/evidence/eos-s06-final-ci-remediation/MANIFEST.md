# EOS-S06 — Final CI Runtime Correction

**Not acceptance.** EOS-S06 remains unaccepted pending AI CTO review. EOS-S07 remains unstarted.

## 1. Final root cause

**HARNESS/RESOURCE.** Formal CI previously ran Event OS Playwright against `next-dev`. Even a single-test shard (`s13-j1-studio`) hit next-dev’s memory threshold (~80s) and restarted → `ERR_CONNECTION_REFUSED`. Sharding alone cannot fix next-dev memory behaviour on GitHub-hosted runners.

## 2. Invalid prior runs (not product-attributable)

| Run | Classification |
|-----|----------------|
| `34966947067` | RESOURCE-CONSTRAINED / INVALID — 279-test monolith vs one next-dev; memory cascade; cancelled |
| `34975914044` | RESOURCE-CONSTRAINED / INVALID — sharded next-dev; shard 0 alone OOM-restarted |

## 3. Production-mode CI architecture

- Workflow **production build** reused.
- Event OS browser corpus: **`next start` only** (never `next-dev` in formal CI).
- Ephemeral GitHub Actions **Postgres 16** service (`ci`/`ci`/`event_os_ci`).
- `DATABASE_URL` points only at that service.
- `ci-postgres-reset.ts`: `DROP SCHEMA public CASCADE` → migrate via `PostgresPlatformStore.open` → `applySyntheticSeedIfNeeded` + seating layout fixtures.
- `EVENT_OS_ALLOW_FIXTURES=1` for synthetic seed only; **no** general production file-store bypass; file-store still refused under production NODE_ENV without DATABASE_URL.
- `productionAuthorised` remains hard-false.
- 17 deterministic shards; DB reset + fresh `next start` per shard; workers=1; retries=0; heap 2048; hard timeouts; failure classification (`PRODUCT_ASSERTION` / `MEMORY` / `TRANSPORT` / `DATABASE` / `SERVER_STARTUP`); artifacts uploaded on failure.

## 4. Ephemeral Postgres isolation

- Service container health-checked; credentials only on the runner.
- Reset script refuses Railway/remote hosts and requires `EVENT_OS_CI_POSTGRES=1`.
- Never uses Railway/production Postgres.

## 5. Accounting

`scripts/ci-e2e-shard-plan.json`: **129 files / 279 tests**, each exactly once (`test/ci-e2e-shard-accounting.test.ts`).

## 6. Files changed

- `.github/workflows/programme-validate.yml`
- `apps/event-os/playwright.config.ts`
- `apps/event-os/scripts/ci-e2e-run-shards.mjs`
- `apps/event-os/scripts/ci-e2e-lifecycle-check.mjs`
- `apps/event-os/scripts/ci-postgres-reset.ts`
- `apps/event-os/scripts/ci-e2e-shard-plan.json`
- `apps/event-os/e2e/s060-helpers.ts` / `s075-section-13.ts` (CI Postgres persistence acceptance)
- `apps/event-os/package.json`
- `apps/event-os/test/ci-e2e-shard-accounting.test.ts`
- this MANIFEST

## 7. Bounded local validation

| Gate | Result |
|------|--------|
| typecheck | pass |
| shard accounting | pass |
| disposable Postgres migrate+seed | pass (`event_os_ci_e2e`) |
| lifecycle next start up/down | pass |
| representative Postgres+next-start shard (`ux001-authority`, 2 tests) | pass |
| `git diff --check` | pass |
| Full 279 suite locally | **not run** |

## 8–17. Commit / push / deploy / CI

Filled after push and single programme-validate run.
