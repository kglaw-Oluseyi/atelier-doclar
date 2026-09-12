# EOS-S06 Build Ledger

**Prompt Control ID:** MD-PR-S070 V2  
**Not acceptance.** Passing retries do not erase first-run failures.

## First-run failures

| Gate | Class | Evidence | Correction | Retry |
|---|---|---|---|---|
| Phase 1 200-guest corpus | Product | First run `TIMED_OUT` at 10,003ms | Reservation-aware constructive seed; skip B&B when seed has zero hard violations | PASS |
| Phase 1 600-guest corpus | Product | First run `TIMED_OUT` at 20,010ms | Same construction/decomposition fix | PASS (cold 3,984ms; warm p95 4,091ms) |
| Event OS production build | Implementation | `seating-verify-as-action.ts` exported synchronous helpers from `"use server"` | Move helpers to `seating-verify-as.ts` | `next build` PASS |
| Playwright `s06-permissions` | Implementation | Admin `listEvents` threw `PERMISSION_ABSENT` and crashed the page | Catch event listing; deny with Annex H copy | PASS |
| Playwright `s06-publication` / `s06-rules-reservations` | Implementation | Annex H publication and reservation sentences were only rendered when those records existed | Keep the copy on the tabs unconditionally | PASS |
| Live authenticated journeys | Secret boundary | `EVENT_OS_ACCESS_TOKEN` is unset in this session; the production token was not requested, printed or inspected | George enters the token directly if live role transitions are required | Health/ready verified without secrets |

## Local gates at handoff

| Gate | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `@maison-doclar/shared-platform` unit | 536 pass / 0 fail |
| `@maison-doclar/event-os` unit | 102 pass / 0 fail |
| `pnpm programme:validate` | PASS (`verdict=NO_CYCLES`) |
| `@maison-doclar/event-os` build | PASS after Verify-as helper split |
| Annex J Playwright (13 tests) | PASS |
| `git diff --check` | PASS |
