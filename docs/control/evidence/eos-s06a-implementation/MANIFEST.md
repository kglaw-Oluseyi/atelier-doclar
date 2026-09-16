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

## Acceptance disposition addendum — 2026-09-16 (`MD-PR-S079`)

Formal acceptance is recorded in `docs/control/EOS_S06A_ACCEPTANCE.md`. This MANIFEST remains implementation evidence, not the acceptance decision itself.

| Field | Value |
|-------|-------|
| Acceptance Prompt Control ID | `MD-PR-S079` |
| Decision | PASS WITH ONE CONTROLLED MINOR OBSERVATION |
| Accepted application SHA | `7f139a556f7c023efa98daccd7bfd29481a05775` |
| Reviewed pre-acceptance documentation/evidence tip | `8e8a6a02e797a4c9cedceb7748667d1a934cbc1a` |
| Railway deployment at acceptance | `7023da83-72dc-4f99-91c1-b3d7aa634087` SUCCESS |
| Controlled minor observation | `TDR-S06A-001` OPEN — not closed |
| EOS-S07 | NOT_STARTED / NOT_AUTHORISED |
| `productionAuthorised` | false |

Historical deployed application SHA rows above remain dated implementation history and are not rewritten.
