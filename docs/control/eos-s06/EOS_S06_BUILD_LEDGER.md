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
| Live CEO `s06-eval-v3` | PASS — 35 cases, hash `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c`. After Section 10 this persist is honestly STALE against current `s06-eval-v4`. Not restamped. Not redeployed. |
| Local Section 10 `s06-eval-v4` | PASS — contract `s06-eval-contract-v4`, 49 cases, corpus hash `0e1a6b403fdc85268e3eb9d154a496ac94c0017714445a677ac285f20df51369`, config hash `5e05590ee74b527002c9cabad6d45384094c4f4f5d56ec2730e60a72840ac815`. Frozen v3 hash unchanged. Live corpus not run. |
| Section 11 isolated development-runtime Playwright | PASS as separate executions — `s075-rule-form`, `s075-capacity`, `s06-solver-feasible`, `s06-solver-infeasible`, `s06-studio-editing`, `s06-rules-reservations`, `s06-v2-s072`, `s06-publication`, `s06-input-readiness`, `s06-reviewer-assignment`, `s06-permissions`, `s06-responsive-accessibility`, `s073-diagnostic-removed`, `s05a-s049-action-result-truth`. Not one combined-suite pass. |
| Section 11 production-mode Playwright | NOT EXECUTED |
| Section 11 live Playwright | NOT EXECUTED |

Packet 8 execution modes remain distinct:

```text
Production build: passed
Production-mode Playwright: not executed because DATABASE_URL was unavailable locally
Isolated development-runtime Playwright: focused S073, S072 and S049 passed
Live production verification: passed on deployed application SHA
```

S073 did not introduce a queue/worker. Launch still completes solver (11–17ms), independent validation (~0–1ms) and terminal persistence before 303. Live POST maxima: launch 2931ms, unrelated mutation 1680ms. No transaction exceeded 2s.

S05A/S05B remain PASSED. Providers remain INACTIVE. `productionAuthorised` remains false. Control Tower was not deployed. EOS-S06 is not accepted. Claude is not run under S073. EOS-S07 is not started.

## MD-PR-S075 first-run failures

| Gate | Class | Evidence | Correction | Retry |
|---|---|---|---|---|
| Section 2 diagnostic tunnel | Infrastructure | Temporary read-only Railway SSH forward `127.0.0.1:55432` ended after package evidence was captured | Record closure; do not reconnect; do not rerun Section 2 | Finding remains valid. 2026-09-13: port `55432` none; no `ssh -L`; Homebrew `postgresql@16` left as a pre-existing machine service |
| Playwright `s075-rule-form` | Test targeting | `getByLabel("Table")` also matched the reservation Table selector; `getByText("Additional guest", { exact: true })` and `getByRole("combobox", { name: "Guest" })` were ambiguous | Name-attribute locators for `guestIdA`/`guestIdB`/`tableId` | PASS after locator correction |
| Section 6 first scoring | Product | Unseated `REQUIRE_TABLE`/`LOCK` counted during partial probes, so the constructive seed seated nobody and large corpora timed out | Count unseated required subjects only on a finished candidate | PASS — `s06-eval-v3` unchanged 35/35; solver 200/600 still FEASIBLE |
| Section 7 Postgres harness | Test infrastructure | MemoryPlatformPg could not parse `seating_v2_*` inserts or apply lifecycle updates, so PostgreSQL integration could not prove replay | Digit-safe table parse, lifecycle UPDATE, and composite idempotency uniqueness | PASS — identical tuple replays with `didDataChange: false` |
| Section 9 differential oracle | Product | Solver claims `FEASIBLE` while leaving required guests unseated. Independent validator returns `INFEASIBLE`. Exhaustive oracle proves `NONE`. Smallest seed `s075-oracle-v1:capacity-infeasible`. Same class: `apart-infeasible`, `forbid-infeasible`, `together-infeasible` | Ratified addendum: finished-candidate unseated required is a hard violation; `FEASIBLE` only with a witness; `INFEASIBLE` only with certificate or bounded exhaustive none; `TIMED_OUT` when proof is incomplete; solver version `s06-solver-v3`. Validator and oracle not weakened. `GOVERNED_UNSEATED` not invented. | PASS — 12/12 agreement and mutations. `s06-eval-v3` 35/35 local, hash unchanged. Section 10 not started |
| Section 10 first corpus | Product | First v4 run failed `S06V4-PATH-01/02/04` because plan assignments persist table tokens, and `S06V4-M07` because a second published layout left the S06 fixture `CURRENT` | Compare seated tables to `seatingV2TableToken`; run the mismatch case on a bare fixture with one current publication | PASS — 49/49 local. Frozen v3 hash unchanged. Mutations, schema and readiness fail-closed. Live corpus not run |
| Section 11 typecheck | Implementation | First `pnpm typecheck` failed: unused `exactHash` in the solver adapter; v4 readiness test treated optional `evaluation` as required; Section 9 mutation compared incompatible validator literals; replay helper required `MemoryPlatformStore`; Event OS lacked `SEAT_CAPACITY_MISMATCH` mapping; Studio helpers typed durable `SpatialObject` against projected objects | Remove unused import; assert evaluation before matching; type historic validator as `string`; accept `PlatformStore`; map mismatch to validation; read projected Studio objects | PASS on retry |
| Section 11 shared-platform suite | Product | First complete suite failed `S06-SOL-04` (`s06-eval-v1`): it still required zero hard violations on `seatingCorpus600()` after the honesty addendum certified that corpus `INFEASIBLE` | Observe `INFEASIBLE` and hard violations present; keep the 20s bound. V1 edition/hash/case IDs unchanged | Focused V1 retry PASS. Complete shared-platform retry 636/636 |
