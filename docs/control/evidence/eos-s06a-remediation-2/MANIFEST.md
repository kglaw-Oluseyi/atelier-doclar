# EOS-S06A Remediation 2 — Evidence manifest

**Date:** 2026-09-15  
**Control:** Consolidated Remediation 2 — Domain-grounded Intelligence (F-1) + F-2/F-3

## Inventory

- `INTELLIGENCE_CROSSWALK.md`

## Focused automation

- `packages/shared-platform/test/domain-resolvers.test.ts`
- `packages/shared-platform/test/atelier-command.test.ts` (remediation-2 cases)
- `apps/event-os/test/build-identity.test.ts`
- `apps/event-os/test/staff-identity-display.test.ts`

## Claude continuation

`docs/control/eos-s06a/EOS_S06A_REMEDIATION_2_CLAUDE_CONTINUATION_PROMPT.md` — prepared; not auto-run.

## Live smoke (post-deploy)

Command: `PLAYWRIGHT_LIVE=1` Playwright `e2e/eos-s06a-live-smoke.spec.ts` via `railway run`

- readiness + seating distinct + reload + business/command truth — PASS
- named cross-event refusal — PASS
- R4 send remains blocked — PASS
- CEO audit + auditor non-mutation — PASS
- 4 passed / 0 failed

Railway event-os: `3bc467b3-81c1-46e8-a39e-70b95ea9cb78` SUCCESS  
Application SHA: `355aa9fc6859801c28f033ff354ba2c037fa76f2`  
Control Tower: SKIPPED

## Explicit status

- EOS-S06: ACCEPTED  
- EOS-S06A: NOT ACCEPTED  
- EOS-S07: NOT_STARTED / NOT_AUTHORISED  
- productionAuthorised: false
