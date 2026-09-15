# EOS-S06A Focused Assurance Evidence

**ID:** `EV-EOS-S06A-FOCUSED`  
**Date:** 2026-09-15  
**Prompt Control ID:** `MD-PR-S078`

## Automated focused suite

Command: `npx tsx --test test/atelier-command.test.ts` (packages/shared-platform)

- tests: 12
- pass: 12
- fail: 0

## Typechecks

- `packages/shared-platform` `tsc --noEmit` — PASS
- `apps/event-os` `tsc --noEmit` — PASS

## Live deployment

| Field | Value |
|-------|-------|
| Service | event-os only |
| Railway deployment | confirmed SUCCESS for application tip |
| Deployed application SHA | `6624e26da52d166338d2164318969d76875d5c6f` tip may advance with smoke-spec commit |
| Persistence | POSTGRES |
| Migrations | APPLIED |
| productionAuthorised | false |
| Providers | INACTIVE (OBJECT_STORE/SCAN/OCR/SOURCE_MONITOR/COMMUNICATIONS) |
| Control Tower | SKIPPED on pushes; not redeployed for this milestone |

## Live smoke

Command: `PLAYWRIGHT_LIVE=1` Playwright `e2e/eos-s06a-live-smoke.spec.ts` via `railway run` (one worker)

- director interpret + plan visible — PASS
- auditor view-only — PASS
- cross-event handoff refusal — PASS
- 3 passed / 0 failed

Synthetic data only. No provider activation.
