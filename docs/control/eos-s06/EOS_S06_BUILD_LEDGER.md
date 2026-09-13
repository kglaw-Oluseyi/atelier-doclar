# EOS-S06 Build Ledger

**Prompt Control ID:** MD-PR-S070 V2 + MD-PR-S071  
**Not acceptance.** Passing retries do not erase first-run failures.  
**Application / deployed SHA:** `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`
**Final repository/docs SHA:** `3f5c09b37d683ad7192660a33f596b7e72d75583` (not redeployed)

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

## MD-PR-S072 first-run failures

| Gate | Class | Evidence | Correction | Retry |
|---|---|---|---|---|
| Shared-platform unit (baseline) | Pre-existing | 5 failures: S05A discovery-token / confirmation / sign-off / investment / no-repeat interview `AUTH_REQUIRED`; S063 dossier grant `FORBIDDEN` | Cited against baseline `844f107`; not dismissed as new | Unchanged at S072 local gates (568 pass / 5 fail) |
| Live seating workspace | Product | Director seating page returned a false FORBIDDEN because `projectWorkspace` listed org-only evaluation/migration tables with `event_id` | Scope org-only and unscoped V2 collections correctly; do not edit 008 | PASS — seating page loads; Director Access Administration remains denied |
| Live HARD create settlement | Test/runtime | First HARD create waited 30s for a result UUID, then succeeded after reload | Recorded; action timeout not inflated | Appeared-after-reload |
| Live Activate | Test targeting | Director `Activate` matched two HARD drafts (strict mode) | Activate each Draft HARD button in turn | Locator corrected |
| Live run launch | Product | `seating run launch` returned unexpected server failure after freeze on SHA `b5132bf` and again on `0d43a9e` | Parse compiled JSONB on read; stop treating launch exceptions as generic 5xx | UNFINISHED — two consecutive publication/replay sequences and live `s06-eval-v2` persist have not passed |

## Local gates at S072 handoff

| Gate | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `@maison-doclar/shared-platform` unit | 568 pass / 5 fail (same baseline S05A/S063 set) |
| `@maison-doclar/event-os` unit | 102 pass / 0 fail |
| `pnpm programme:validate` | PASS (`verdict=NO_CYCLES`) |
| `@maison-doclar/event-os` build | PASS |
| Focused V2 suites (hash/compiler/validator, command path, eval v2, persistence, access hotfix) | PASS |
| `git diff --check` | PASS |
| Live readiness on `0d43a9e` | PASS — POSTGRES / APPLIED / `productionAuthorised:false` / providers INACTIVE / S05A+S05B PASSED |
| Live Director admin denial / Auditor no mutate / Admin no seating | PASS |
| Live Planner SOFT self-activate / HARD self-activate denied | PASS |
| Live publication/replay sequences (2) | UNFINISHED at S072 handoff — later passed on S073 SHA `1ce6e0f` |
| Live CEO `s06-eval-v2` persist | UNFINISHED at S072 handoff — successor live persist is `s06-eval-v3` on `1ce6e0f` |

S05A/S05B remain PASSED. Providers remain INACTIVE. `productionAuthorised` remains false. Control Tower was not deployed. EOS-S06 is not accepted. Claude is not run. EOS-S07 is not started.

## MD-PR-S073 first-run failures

| Gate | Class | Evidence | Correction | Retry |
|---|---|---|---|---|
| Packet 2 launch TX | Product | Solver/validator ran between `TX_BEGIN` and `TX_COMMIT` on `b1da257` | Split compute outside seating transactions (`9dafb84`) | Packet 7 first corrected measurement + Packet 7 Gate E resample |
| Packet 6 local clock | Test | Fixture token/clock isolation | `EVENT_OS_TEST_NOW` / one injected clock | Local gates PASS |
| Packet 7 post-Adopt | Product | Studio form did not emit POST after Adopt (consume remount) | Consume action result once (`caff006`) | Live Gate B PASS on `1ce6e0f` |
| Packet 7 Gate B spec | Test targeting | `textContent().catch` swallowed the rejection banner | Read the banner (`2f97603`, `0e5f2c4`) | Focused spec PASS |
| Packet 7 Gate E wrapper | Measurement | `otherMs=3429` / `launchMs=5790` included other-tab navigation | Stage-scoped resample; wrapper retained | POST max launch 2931 / other 1680 |
| Packet 8 `next build` | Tooling | Concurrent Playwright `.next` broke page collection | Clean rebuild | Production build PASS |
| Packet 8 batched Playwright | Tooling | First development-runtime batch aborted (`SegmentViewNode` / `ECONNRESET`) | Isolated `pnpm dev` rerun of affected journeys | First run NOT a pass; isolated later PASS |
| Packet 8 `PLAYWRIGHT_PROD=1` | Tooling | Production runtime requires `DATABASE_URL`; unavailable locally | Not rerun; leftover job terminated | NOT EXECUTED — not a pass |

## Local and live gates at S073 Packet 8

| Gate | Result |
|---|---|
| Typecheck (shared-platform + Event OS) | PASS |
| `@maison-doclar/shared-platform` unit | 590 pass / 0 fail |
| `@maison-doclar/event-os` unit | 106 pass / 0 fail |
| `pnpm programme:validate` | PASS (`verdict=NO_CYCLES`) |
| `@maison-doclar/event-os` production build | PASS |
| `git diff --check` | PASS |
| Production-mode Playwright | NOT EXECUTED — `DATABASE_URL` unavailable locally |
| Isolated development-runtime Playwright | PASS — focused S073, S072 and S049 |
| Live production verification on `1ce6e0f` | PASS — POSTGRES / APPLIED / `productionAuthorised:false` / providers INACTIVE / S05A+S05B PASSED |
| Live diagnostics | 404; diagnostic token absent |
| Live publication/replay (2) on `1ce6e0f` | PASS — Publication 3 `292fb1ea…` and Publication 4 `a6ac23f6…` |
| Live CEO `s06-eval-v3` | PASS — 35 cases, hash `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c` |

Packet 8 execution modes remain distinct:

```text
Production build: passed
Production-mode Playwright: not executed because DATABASE_URL was unavailable locally
Isolated development-runtime Playwright: focused S073, S072 and S049 passed
Live production verification: passed on deployed application SHA
```

S073 did not introduce a queue/worker. Launch still completes solver (11–17ms), independent validation (~0–1ms) and terminal persistence before 303. Live POST maxima: launch 2931ms, unrelated mutation 1680ms. No transaction exceeded 2s.

S05A/S05B remain PASSED. Providers remain INACTIVE. `productionAuthorised` remains false. Control Tower was not deployed. EOS-S06 is not accepted. Claude is not run under S073. EOS-S07 is not started.
