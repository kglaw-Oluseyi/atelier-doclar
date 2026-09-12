# EOS-S06 Build Ledger

**Prompt Control ID:** MD-PR-S070 V2 + MD-PR-S071  
**Not acceptance.** Passing retries do not erase first-run failures.  
**Application / deployed SHA:** `70d9976730ccdbe0f5812f2bf6f68bd1cd055d8e`

## First-run failures

| Gate | Class | Evidence | Correction | Retry |
|---|---|---|---|---|
| Phase 1 200-guest corpus | Product | First run `TIMED_OUT` at 10,003ms | Reservation-aware constructive seed; skip B&B when seed has zero hard violations | PASS |
| Phase 1 600-guest corpus | Product | First run `TIMED_OUT` at 20,010ms | Same construction/decomposition fix | PASS (cold 3,984ms; warm p95 4,091ms) |
| Event OS production build | Implementation | `seating-verify-as-action.ts` exported synchronous helpers from `"use server"` | Move helpers to `seating-verify-as.ts` | `next build` PASS |
| Playwright `s06-permissions` | Implementation | Admin `listEvents` threw `PERMISSION_ABSENT` and crashed the page | Catch event listing; deny with Annex H copy | PASS |
| Playwright `s06-publication` / `s06-rules-reservations` | Implementation | Annex H publication and reservation sentences were only rendered when those records existed | Keep the copy on the tabs unconditionally | PASS |
| Live authenticated journeys | Secret boundary | `EVENT_OS_ACCESS_TOKEN` is unset in this session; the production token was not requested, printed or inspected | George enters the token directly if live role transitions are required | Health/ready verified without secrets |
| S070 live reviewer seating | Authority | Reviewer org assignment could `seating.view` but `listEvents`/`getEvent` hid Alpha One (`NOT_FOUND`) | Canonical event-scoped assignment `…000068` plus `event.list`/`event.view` on the existing role | Reviewer discovers only Alpha One |
| S070 live reserve/adopt banner | Test targeting | Old action-result banner/`result` UUID satisfied the next action | Helper requires a new result UUID; stale banner cannot settle a new command | PASS |
| S070 live SEQ1 successor adopt | Test targeting | First Adopt button reused the prior run; working edition stayed APPROVED | Adopt the newest run and require a fresh success UUID | Successor DRAFT with Publication last-known-good |
| S071 live CEO `s06-eval-v1` | Product | First two live evals returned unexpected server failure; JS observation arrays were sent as Postgres arrays into JSONB | Serialize evaluation observations/assertions; compute corpus before the write transaction | PASS 59/59, 0 failed, ~10s |

## Local gates at S071 handoff

| Gate | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `@maison-doclar/shared-platform` unit | 541 pass / 0 fail |
| `@maison-doclar/event-os` unit | 102 pass / 0 fail |
| `pnpm programme:validate` | PASS (`verdict=NO_CYCLES`) |
| `@maison-doclar/event-os` build | PASS |
| Annex J + reviewer Playwright (15 tests) | PASS |
| `git diff --check` | PASS |
| Live S070/S071 gates on `70d99767` | 5 passed / 0 failed |

S05A/S05B remain PASSED. Providers remain INACTIVE. `productionAuthorised` remains false. Control Tower was not deployed.
