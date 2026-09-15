# EOS-S06 — CI Harness Correction

**Not acceptance.** EOS-S06 remains unaccepted pending AI CTO review. EOS-S07 remains unstarted.

## Invalid prior run

| Field | Value |
|-------|-------|
| Run | `34966947067` |
| Classification | **RESOURCE-CONSTRAINED / INVALID FOR PRODUCT ATTRIBUTION** |
| Why | Single Playwright process ran 279 tests against one persistent `next-dev` with `EVENT_OS_E2E_HEAP_MB=6144`; next-dev memory restarts → ECONNRESET cascade. `PLAYWRIGHT_PROD` unset so the workflow’s production build was unused. Human cancel during Event OS e2e. |

## Root cause

Harness/resource: monolithic next-dev e2e under GitHub-hosted memory limits, not product assertions.

## Selected design

**Sharded next-dev** (`design: sharded-next-dev`).

Production-mode (`next start`) cannot use the synthetic file-store without `DATABASE_URL` because `runtime.ts` refuses production NODE_ENV without Postgres. Enabling fixtures under production NODE_ENV would require application/runtime changes. Formal CI must not connect to Railway/Postgres. Therefore:

- Keep workflow production **build** for compile truth.
- Execute browser corpus as **17 deterministic shards**.
- Each shard = separate Playwright process → fresh `webServer` (`reuseExistingServer: false`) → process exit terminates next-dev.
- One worker, zero retries, hard per-shard timeout, heap **3072**.
- Failed-shard logs + Playwright artifacts uploaded on CI failure.

## Accounting

Committed plan `apps/event-os/scripts/ci-e2e-shard-plan.json`:

- 129 files / **279 tests** assigned exactly once (unit-proven via `test/ci-e2e-shard-accounting.test.ts` against `playwright test --list`).

## Local bounded validation

| Gate | Result |
|------|--------|
| Shard accounting test | pass |
| event-os typecheck | pass |
| Lifecycle start/stop (`e2e:ci:lifecycle`) | pass — port 3020 up during run, closed after exit |
| Representative small shard (`ux001-authority.spec.ts`, 2 tests) | pass |
| `git diff --check` | pass |
| Full 279 monolith | **not run** (forbidden) |

## Deployment protection

Event OS `watchPatterns` temporarily set to `/__CONTROLLED_DEPLOY_ONLY__/**` before harness push; restored to `[]` after push settles. Control Tower already guarded. No Event OS or Control Tower deploy for this harness-only change.

## Formal CI

| Field | Value |
|-------|-------|
| Ending HEAD | `dd3e18b67ebb706ff102986c5582a4a9a3a6bab0` |
| Run | `34975914044` — https://github.com/kglaw-Oluseyi/atelier-doclar/actions/runs/34975914044 |
| Conclusion | **failure** (not green) |
| Duration | ~13m34s |
| Event OS deploy from harness push | **none** (deployedSha remained `233afaa…`) |

### Job steps

All steps through Control Tower browser tests **success**.
**Event OS browser tests (sharded)** **failed** on first shard.
Artifact upload **success**.

### Shard outcome

| Shard | Result |
|-------|--------|
| 0 `s13-j1-studio` (1 test) | **failed** — next-dev: “Server is approaching the used memory threshold, restarting…” then `net::ERR_CONNECTION_REFUSED` on `page.goto` (guest staff-response navigation). **HARNESS/RESOURCE**, not a clean product assertion. |
| 1–16 | not started (runner exits on first shard failure) |

### Artifacts

`event-os-playwright-shards` — `ci-e2e-shard-logs/`, `test-results/` (downloaded for analysis).

### Attribution

Formal CI is **not completely green**. Remaining blocker is still harness/resource pressure inside the heaviest Section 13 journey even as a single-file shard. Requires a further harness strategy (not product journey remediation from this failure alone).
