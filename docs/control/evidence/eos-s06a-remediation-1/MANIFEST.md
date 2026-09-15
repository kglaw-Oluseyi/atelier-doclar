# EOS-S06A Remediation 1 — Evidence manifest

**Date:** 2026-09-15  
**Control:** Consolidated Remediation 1

## Investigation

- `RECONSTRUCTION.md` — durable ledger + audit chronology from production
- `ledger-recon-raw.txt` — raw reconstruction dump (no secrets)

## Focused automation

Command: `npx tsx --test test/atelier-command.test.ts` (packages/shared-platform)

- tests: 16
- pass: 16
- fail: 0

Includes remediation coverage for Intelligence answers, cross-event named refusal, R4 non-downgrade, explain_block vs send, executive audit discoverability.

## Role-label disposition

Fixture naming ambiguity: person `…042` displayName is “Event Director” while role key is `EVENT_DIRECTOR`. Assignment data is correct. Not a defect.

## Claude continuation

`docs/control/eos-s06a/EOS_S06A_REMEDIATION_1_CLAUDE_CONTINUATION_PROMPT.md` — prepared; not auto-run.

## Live smoke (post-remediation)

Command: `PLAYWRIGHT_LIVE=1` Playwright `e2e/eos-s06a-live-smoke.spec.ts` via `railway run` (one worker)

- two Intelligence answers + reload persistence — PASS
- named cross-event refusal — PASS
- R4 send remains blocked / not claimed as real send — PASS
- CEO audit filter + auditor non-mutation — PASS
- 4 passed / 0 failed

Synthetic only. No provider activation. Control Tower SKIPPED.

## Deployment-identity correction

- `IDENTITY_ADDENDUM.md` — full SHA chain, root cause B+C, before/after health, bundle proof, tests, smoke
- Correction commit / live application SHA: `d1ca4a7f4d92031ac236880c0e92f8c290546db4`
- Railway event-os deployment: `1ac090cf-e3c0-4180-8ecd-d6b2fc0c46a0` SUCCESS
- Focused identity tests: 7/7 PASS (`apps/event-os/test/build-identity.test.ts`)
- Live smoke re-run after identity deploy: 4/4 PASS
- Control Tower: SKIPPED
- Claude: not run
- EOS-S06A: NOT ACCEPTED
