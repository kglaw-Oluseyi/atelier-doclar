# MD-PR-S073 — Diagnostic Finding

**Authority:** `MD_PR_S073_EOS_S06_V2_LIVE_COMMAND_SETTLEMENT_AND_PROCESS_ISOLATION.md`  
**Authority SHA-256:** `9e527f289b71c5d794f472bf271839799a042916985b1eda288028b8709537ff`  
**Diagnostic application / live SHA:** `b1da2570812a633714667c87b94217f1a94c9445`  
**Railway Event OS deployment:** `39bdd2d0-ced6-4970-ae50-d1ff26294758` SUCCESS  
**Reproduction:** one live Playwright diagnostic on Alpha One (`…000021`) plus one in-process unit proof  
**Production:** `productionAuthorised:false` · fixtures enabled · S05A/S05B unchanged PASSED · adapters INACTIVE

Temporary `EVENT_OS_DIAGNOSTIC_TOKEN` is set on Event OS only. It is not recorded here.

---

## Verdict

**Proven branch: B.**  
`launchRun` begins a PostgreSQL transaction, executes `solveSeatingV2Compiled` and `validateSeatingV2` on the request thread while that transaction is open, then inserts the terminal run and commits.

**Not proven by Packet 2 thresholds: A.**  
Event-loop utilization reached ≥0.9 during concurrent seating RSC, but the probe stayed available and never exceeded 2s continuously for ≥5s.

**Rejected: C, D, E, F.**

Packet 4 may apply only the Branch B correction: split the transaction around compute; no solver, validator or other non-database work inside a transaction. Worker isolation is not authorised because Branch A is not proven.

---

## 1. Healthy first mutation — freeze

| Field | Value |
|---|---|
| commandId | `d3b96d6a-8e31-4f88-a57a-dbf947b8d5b2` |
| requestId | `73c469de-c294-4999-a49f-aafceb8b2d0b` |
| resultId | `12fb2146-ae11-44bb-a871-28fad98553bd` |
| commandType | `seating.input.freeze` |
| Browser | one mutation POST; response **303**; `?result=` new UUID; banner correlation equals URL |
| Previous result | none |

Ordered stages (wallMs):

| Stage | wallMs | Notes |
|---|---|---|
| HTTP_RECEIVED | 0 | Node server-action entry |
| ACTION_ENTER | 87 | idempotency UUID bound as commandId |
| TX_BEGIN | 226 | `seating-v2-postgres` |
| TX_COMMIT | 508 | durationMs 282 |
| ACTION_RESULT_WRITTEN | 510 | `RECALL_HIT` after in-process recall |
| REDIRECT_EMITTED | 510 | SUCCESS / APPLIED |
| HTTP_RESPONSE | 510 | `NEXT_REDIRECT` rethrown |

Playwright settlement: `resultUrlMs` 1878 · overview 2684 · banner 2689. Last completed server stage: `HTTP_RESPONSE`. Result was present for the subsequent render (banner matched).

Durable row: freeze writes an input package inside the same transaction. No solver on this command.

---

## 2. Launch (intended expensive / impossible) and concurrent freeze

| Field | Value |
|---|---|
| commandId | `2fa5f7d8-30fb-48aa-aded-f7b1f1464a65` |
| requestId | `39eb74ea-30f9-44ef-8887-cde3f8a94a28` |
| resultId | `3073d00a-f69d-49f6-ac19-7f863cca61e4` |
| runId | `ab8b7564-1069-4ab4-b12d-65117aa61511` |
| commandType | `seating.run.launch` |
| Browser | POST observed; response **303**; fresh result UUID ≠ previous `12fb2146-…`; banner settled |
| Server wall | 671 ms to HTTP_RESPONSE |
| Playwright wall | 5993 ms including concurrent page work |

Ordered stages (wallMs):

| Stage | wallMs | Notes |
|---|---|---|
| HTTP_RECEIVED | 0 | |
| ACTION_ENTER | 91 | |
| TX_BEGIN | 211 | `seating-v2-postgres` |
| SOLVER_START | 344 | inside the open transaction |
| SOLVER_TERMINAL | 352 | durationMs **8**; reasonClass `INFEASIBLE` |
| RUN_QUEUED | 357 | emitted after insert; reasonClass `INFEASIBLE` — not a real QUEUED row |
| TX_COMMIT | 669 | durationMs **458** |
| ACTION_RESULT_WRITTEN | 670 | `RECALL_HIT` |
| REDIRECT_EMITTED | 670 | SUCCESS / APPLIED |
| HTTP_RESPONSE | 671 | `NEXT_REDIRECT` |

Last completed server stage: `HTTP_RESPONSE`. Durable run exists after commit with validator `INFEASIBLE`. Solver claim is evidence only.

This live launch was computationally cheap (8 ms). The S072 30-second hang was **not reproduced** on this sample. The stage order still proves the transaction spans solver and validator.

Concurrent unrelated mutation (second Planner freeze):

| Field | Value |
|---|---|
| commandId | `5bfaa01a-e8b7-4b5f-9bd5-d98dd3c0c2db` |
| Settlement | `resultUrlMs` 2881 · banner 3688 · no error |
| Trace fetch | 404 — diagnostic rate-limit after event-loop polling, not a missing command |

The concurrent freeze produced a fresh banner. It did not hang for 30 seconds.

---

## 3. Event-loop evidence

Baseline (separate context, before mutations): lagP99 22 ms, lagMax 35 ms, utilization 0.011, RTT 245 ms, instance hash `8e0f99f97e5b8e08`.

During launch + concurrent seating navigation, recovered samples included utilization 0.988, 0.968, 0.991, 0.983 and lagMax 447–670 ms. The probe remained HTTP 200. No sample was unavailable. No period of probe RTT or lag >2000 ms lasting ≥5 s.

After the launch committed, utilization returned to ~0.015–0.025 and lagP99 to ~20–23 ms.

**Branch A threshold not met.** The high-utilization window coincides with seating RSC / concurrent navigation, not with a multi-second solver. Worker isolation is not authorised.

---

## 4. Database / pool evidence

Separate observation connection during the concurrent window:

| Metric | Value |
|---|---|
| persistence | POSTGRES |
| maxActiveTxMs | 590 |
| maxIdleInTxMs | 0 |
| wait events | `idle in transaction` / `Client` / `ClientRead` (two sessions) |
| pool acquireMs | 2 |
| pool total / idle / waiting | 2 / 1 / 0 |

No lock or pool wait >1 s. No recorded idle-in-transaction age >500 ms on this snapshot. Active transaction age 590 ms is below the 2 s Branch B duration trigger and is consistent with the 458 ms launch transaction.

---

## 5. In-process confirmation (not live)

`packages/shared-platform/test/seating-settlement-trace.test.ts` runs `launchRun` under `runWithSettlementTrace` and requires stage order:

`TX_BEGIN` → `SOLVER_START` → `SOLVER_TERMINAL` → `RUN_QUEUED` → `TX_COMMIT`

with `TX_BEGIN.wallMs ≤ SOLVER_START.wallMs ≤ SOLVER_TERMINAL.wallMs ≤ TX_COMMIT.wallMs`.

---

## 6. Branch classification

| Branch | Decision | Why |
|---|---|---|
| **B** | **Proven** | Live and unit timelines place `SOLVER_START` / `SOLVER_TERMINAL` strictly between `TX_BEGIN` and `TX_COMMIT`. Validator and run insert occur in the same transaction. Packet 1 already mapped this; Packet 2 measured it. |
| A | Not proven | Utilization ≥0.9 occurred, but the probe was never unavailable and never >2 s continuously for ≥5 s. Solver on the live launch was 8 ms. |
| C | Rejected | Pool acquire 2 ms; waiting 0; no lock wait >1 s. |
| D | Rejected | Both commands returned 303 with a fresh result UUID; banner correlation equalled the URL; in-process recall was `RECALL_HIT`. |
| E | Rejected | Redirect sentinel was rethrown (`HTTP_RESPONSE` / `NEXT_REDIRECT`). No 200-without-redirect conversion on these commands. |
| F | Rejected | No `QUEUED`/`RUNNING` row or lease was written. Launch inserts a terminal `INFEASIBLE`/`FEASIBLE` run inside the same transaction. V2 cancel/lease recovery does not exist and did not gate the concurrent freeze. |

Coexisting note: if a future package makes the inline solver expensive, Branch A could appear on the same code path because the solver occupies the request thread. That is not proven on this reproduction and does not authorise a worker.

---

## 7. Exact last completed stage

| Command | Last completed stage | Outcome |
|---|---|---|
| Freeze | `HTTP_RESPONSE` | APPLIED, 303, result presented |
| Launch | `HTTP_RESPONSE` | APPLIED, 303, result presented, run `INFEASIBLE` after 8 ms solver |
| Concurrent freeze | Playwright banner settled | Trace read rate-limited (404) |

The remaining S072 live-gate failure (POST with no new `?result=` within 30 s) was not reproduced on `b1da257` with this cheap launch. The measured defect that matches an authorised correction is Branch B’s transaction/compute coupling.

---

## 8. Permitted next correction

Packet 3/4 may implement only:

- split the seating command transaction so solver and independent validator run outside every database transaction;
- keep acknowledgement, idempotency, audit and terminal persistence in short transactions;
- do not introduce a worker, sibling process, new action-result store, timeout increase, or shared action-result rewrite.

HARD STOP not triggered: Branch B is established and has an authorised correction.
