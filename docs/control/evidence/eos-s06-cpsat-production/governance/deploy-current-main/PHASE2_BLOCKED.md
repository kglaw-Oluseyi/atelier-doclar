# Phase 2 blocked — pre-deploy checklist failed

**Date:** 2026-09-18  
**Decision:** **No Event OS deploy.** Phase 3 not started.  
**Live remains:** deployment `4083bd05-6a51-4572-ba61-35ccd8f05f5e` / commit `737d9327955a114a90609a450cc0b5fbbc24eb65` (Phase 1 proven).

## Why Phase 2 stopped

Phase 1 established live is on `737d932…`, which is an ancestor of current `origin/main` (`7c26f82…`) but **not** current main — a deploy would be required to put tip-of-main into production. The Phase 2 pre-deploy checklist did **not** clear.

### Checklist results

| Gate | Result | Artifact |
|------|--------|----------|
| Tracked git tree clean; `HEAD` == `origin/main` | **PASS** | `01_PREDEPLOY_GIT.txt` — HEAD `7c26f82e17ef547bad70a4ba79950c71da164a26` |
| Full monorepo `pnpm typecheck` | **FAIL** | `02_TYPECHECK.txt` — `@maison-doclar/shared-platform` `tsc --noEmit` exit 2 (many errors in `test/*.ts`, including missing `pg` types and CPSAT fixture typing) |
| `event-os` test suite | **FAIL** | `04_EVENT_OS_TEST.txt` — 158 pass / **3 fail** (see below) |
| `shared-platform` test suite | **NOT COMPLETED** | Suite still executing heavy capacity qualification tests after ~9+ minutes CPU; process stopped to avoid unbounded run. Partial output in `03_SHARED_PLATFORM_TEST.txt` |
| Rollback target recorded | **PASS** (no deploy) | `05_ROLLBACK_AND_WORKER.txt` — `4083bd05-…` / `737d932…` |
| Frozen worker untouched | **PASS** (no deploy) | Solver-worker left as-is |

### event-os failures (exact)

1. **`ci-e2e-shard-accounting.test.ts`** — `143 !== 130` (Playwright file inventory vs shard map; local untracked `e2e/` files inflate the count).
2. **`s06-claude-remediation-copy.test.ts` DEF-02** — seating publication copy regex `/remains operational until a successor is published|…/` no longer matches page source.
3. **`seating-v2-replacement-fail-closed.test.ts`** — page source no longer matches `/projectCurrentPublication/`.

These were **not** fixed in this task (per instruction: do not silently remediating as part of deploy).

### Identity note for any future deploy

Railway service still pins `EVENT_OS_GIT_SHA=737d9327955a114a90609a450cc0b5fbbc24eb65`. A tip-of-main deploy **must** update that pin to the deployed commit (normal Event OS identity maintenance); leaving it stale would embed the wrong `BUILD_APPLICATION_SHA` even if `RAILWAY_GIT_COMMIT_SHA` advances. `EVENT_OS_DOCS_HEAD` should remain the deliberate docs tip unless governance says otherwise.

## Phases reached

| Phase | Status |
|-------|--------|
| 1 — SHA reconciliation | **Done** — `DEPLOYED_SHA_RECONCILIATION.md` + commit `7c26f82` |
| 2 — Deploy current main | **Blocked** — checklist failures above; no deploy triggered |
| 3 — Live browser acceptance | **Not started** |
