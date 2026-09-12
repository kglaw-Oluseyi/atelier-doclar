# MD-PR-S073 Packet 7 — First corrected live measurement

**Authority:** `MD_PR_S073_EOS_S06_V2_LIVE_COMMAND_SETTLEMENT_AND_PROCESS_ISOLATION.md`  
**Authority SHA-256:** `9e527f289b71c5d794f472bf271839799a042916985b1eda288028b8709537ff`  
**Measured application / live SHA:** `025560814ea5148bdd86fa5e5a9b71bd5c4a1289`  
**Fixture:** synthetic event `e1c2c63c-6015-4d55-8a34-1eb94eb1ce2b` (`S073-20260912T234215 Seating`)  
**Not used:** accumulated Alpha One `…000021`  
**Production:** `productionAuthorised:false` · fixtures enabled · S05A/S05B unchanged PASSED  

Temporary `EVENT_OS_DIAGNOSTIC_TOKEN` was set on Event OS only for this measurement. It is not recorded here. The token and diagnostic routes are removed in the next application SHA.

---

## Verdict

**Branch B correction is proven live.**  
`launchRun` now commits the package-read transaction, then runs the solver outside every database transaction, then opens a second short transaction to persist the terminal run.

Packet 2 on `b1da257` had `SOLVER_START` / `SOLVER_TERMINAL` strictly between one `TX_BEGIN` and `TX_COMMIT`. This measurement reverses that order.

---

## First-run failures (honest)

1. Provision helper locators used `.or()` / unscoped assignment lists and hit Playwright strict-mode. Product create/grant/layout/publish succeeded. Helper corrected.
2. First freeze on this event (earlier attempt) completed on the server (`HTTP_RESPONSE` + `RENDER_RESULT_FOUND` for result `d2a853a6-…`) but Playwright timed out waiting for `seating-overview` after the URL already had `?result=`. Classification: client settlement flake, not Branch B. Rerun freeze was a same-content replay and settled.
3. Concurrent freeze traces and mid-launch `db-wait` returned 404 because the 250 ms diagnostic rate-limit was consumed by event-loop polling. Same limitation as Packet 2. Transaction durations come from the settlement traces themselves.

---

## 1. Healthy first mutation — freeze (replay of the earlier applied package)

| Field | Value |
|---|---|
| commandId | `3ea20384-ae60-468a-941c-fc867c1cf819` |
| resultId | `71dc8a61-0978-4be7-ad99-f46a4fb8b645` |
| commandType | `seating.input.freeze` |
| Browser | one mutation POST; response **303**; `?result=` new UUID; banner correlation equals URL |
| Previous result | none |
| Playwright | resultUrlMs 1874 · overview 2678 · banner 2681 |

Ordered stages (wallMs): `HTTP_RECEIVED` 0 → `ACTION_ENTER` 92 → `TX_BEGIN` 225 → `TX_COMMIT` 364 (139 ms) → `TX_BEGIN` 366 → `TX_COMMIT` 437 (71 ms) → `ACTION_RESULT_WRITTEN` / `REDIRECT_EMITTED` / `HTTP_RESPONSE` 438. Outcome `REPLAYED`. No solver on this command. Both transactions under 2 s.

---

## 2. Launch — solver outside the transaction

| Field | Value |
|---|---|
| commandId | `b44fa8fd-3f2f-4e62-9362-8b35830c03c0` |
| resultId | `48fd3baa-279c-4ad1-88f3-bcb443017d3a` ≠ previous `71dc8a61-…` |
| runId | `80edc244-a311-4b89-8f48-7a6a0ac71884` |
| commandType | `seating.run.launch` |
| Browser | POST observed; response **303**; banner settled; Playwright wall 6597 ms including concurrent page work |
| Server wall | 786 ms to `HTTP_RESPONSE` |

Ordered stages (wallMs):

| Stage | wallMs | Notes |
|---|---|---|
| HTTP_RECEIVED | 0 | |
| ACTION_ENTER | 82 | |
| TX_BEGIN | 201 | package read |
| TX_COMMIT | 351 | durationMs **150** — compute has not started |
| SOLVER_START | 351 | **after** first commit |
| SOLVER_TERMINAL | 377 | durationMs **26**; reasonClass `FEASIBLE` |
| TX_BEGIN | 379 | persist terminal run |
| RUN_QUEUED | 438 | emitted after insert; reasonClass `FEASIBLE` — not a QUEUED row |
| TX_COMMIT | 785 | durationMs **406** |
| ACTION_RESULT_WRITTEN | 786 | `RECALL_HIT` |
| REDIRECT_EMITTED | 786 | SUCCESS / APPLIED |
| HTTP_RESPONSE | 786 | `NEXT_REDIRECT` |

`SOLVER_START` / `SOLVER_TERMINAL` are not inside any `[TX_BEGIN, TX_COMMIT]` interval.

Concurrent unrelated Planner freeze: settled in 4204 ms (`resultUrlMs` 2876 · banner 4181), no error, fresh banner. Trace read 404 (rate-limit).

---

## 3. Event-loop / isolation

Baseline: lagP99 22 ms, utilization 0.06, RTT 214 ms, instance `fc12af4fcf766848`.

During launch + concurrent seating RSC, recovered samples included utilization 0.93–0.995 and lagMax 174–882 ms. Probe stayed HTTP 200. No sample unavailable. No period of probe RTT or lag >2000 ms lasting ≥5 s.

After launch committed, utilization returned to ~0.01–0.02 and lagP99 to ~20–22 ms.

No transaction >2 s. Persist TX 406 ms is above the 300 ms target and below the 2 s gate. Solver itself 26 ms.

---

## 4. Permitted next step

Remove/disable the temporary diagnostic routes, unset `EVENT_OS_DIAGNOSTIC_TOKEN`, commit, push, redeploy Event OS only, and run Packet 7 gates A–E plus publication/eval on that later SHA against this same synthetic S073 event.
