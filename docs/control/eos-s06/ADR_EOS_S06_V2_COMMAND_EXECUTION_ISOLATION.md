# ADR — EOS-S06 V2 command execution isolation

**Status:** Accepted for MD-PR-S073 Packet 3/4  
**Date:** 2026-09-12  
**Diagnostic SHA:** `b1da2570812a633714667c87b94217f1a94c9445`  
**Finding:** `docs/control/eos-s06/MD_PR_S073_DIAGNOSTIC_FINDING.md`  
**Proven branch:** B  
**Executor option:** none. Branch A is not proven. Worker threads and a sibling Node worker are not selected.

---

## Observed branches

| Branch | Packet 2 result |
|---|---|
| B | Proven. `SOLVER_START` / `SOLVER_TERMINAL` occur between `TX_BEGIN` and `TX_COMMIT` on live launch `2fa5f7d8-…` and in the in-process trace test. |
| A | Not proven. Utilization ≥0.9 during seating RSC; probe never unavailable and never >2 s for ≥5 s. |
| C, D, E, F | Rejected. See the finding. |

Exact last completed live launch stage: `HTTP_RESPONSE` after a 458 ms transaction that included an 8 ms solver. The S072 30 s hang was not reproduced on that cheap package. The authorised defect is the transaction/compute coupling.

---

## Chosen correction

Split seating V2 command transactions so **solver, independent validator and package compilation run outside every database transaction**.

Launch:

1. Short transaction: authorise, load package, replay existing run if the solver tuple matches, load compiled request JSON, commit.
2. `solveSeatingV2Compiled` then `validateSeatingV2` with no open transaction.
3. Short transaction: re-check replay/idempotency, insert run, assignments, validation rows, receipt and audit, commit.
4. `redirect()` remains after those transactions and outside `catch`, as already implemented.

Freeze:

1. Short transaction: read ACTIVE rules/reservations and related rows, commit.
2. Canonicalise and hash outside the transaction.
3. Short transaction: replay-or-insert the immutable package, commit.

No worker, no sibling process, no new Railway service, no new action-result store, no timeout increase.

---

## Rejected corrections

| Correction | Why rejected |
|---|---|
| `worker_threads` executor | Branch A not proven. Pack allows at most two executor designs and only if event-loop starvation is proven. |
| Sibling Node worker | Same. Fallback is available only after measured rejection of threads. |
| Shared action-result persistence rewrite | Branch D not proven. Cookie + in-process recall already bound the live 303 results. |
| Redirect / catch rewrite | Branch E not proven. `NEXT_REDIRECT` is already rethrown. |
| Lease / reaper / QUEUED architecture | Branch F not proven. Do not invent queue/lease runtime for an unproven branch. |
| Prisma or another ORM | Forbidden. Continue with `pg` `Pool` and `SeatingV2Repository.transaction`. |

---

## Transaction boundaries

| Transaction | Contents | Must not contain |
|---|---|---|
| Launch prepare | Guard, idempotency lookup, package load, semantic-run replay, compiled-request load | Solver, validator, page render |
| Launch terminal | Replay re-check, run/assignment/validation inserts, receipt, audit | Solver, validator |
| Freeze read | ACTIVE edition lists and members | `compileSeatingV2Request` |
| Freeze write | Identity replay and package inserts | Compilation, hashing of large graphs already computed |
| Other mutate() commands | Existing short writes | Solver, validator, export, page render |

`lockEventCurrent` remains only where `pointCurrent` already uses it. Do not hold event/package/plan locks during solve.

---

## Process / thread topology

Unchanged: one Event OS Node process, Next.js `next start`, `pg` pool max 4, inline `solveSeatingV1` on the request thread **after** the prepare transaction commits. No `instrumentation.ts`, no worker entry, no production `SOLVER_EXECUTION` switch.

---

## Cancellation guarantee

Unchanged cooperative `Date.now()` deadline inside the V1 solver. Packet 2 did not authorise `worker.terminate()`. Timeout remains cooperative on the request thread. This is recorded debt if Branch A is later proven.

---

## Run, lease and retry semantics

Unchanged schema statuses. `launchRun` still persists `FEASIBLE` \| `INFEASIBLE` after independent validation. `QUEUED` / `RUNNING` / lease columns remain unused. Same-command idempotency and semantic run replay remain the only duplicate suppressors. Unique replay identity on `(organisation, event, package_hash, solver_version, solver_config_hash, seed)` stays the database backstop if two prepares race.

---

## Action-result scope

Not reopened. Write remains cookie + in-process recall after the business command returns.

---

## Migration

None. No new tables or columns. Historic rows stay as written.

---

## Build / deployment

Event OS only, after Packet 6 gates. Diagnostic routes may remain through the first corrected live measurement (Packet 7), then must be removed.

---

## Rollback / forward recovery

Rollback: redeploy `66e5bc18dad3632fbca4b21da2bdf56afa084cd1` if the correction SHA is unsafe. Forward: the split is additive behaviour; terminal runs already stored remain immutable.

---

## Regression scope

S072 V2 truth, hash, validator, reservation ACTIVE-only freeze, adopt-requires-current-FEASIBLE, recall content hash, last-known-good publication. No corpus edition change unless Packet 6 later requires it because observations changed.

---

## Tests-first contract

Focused tests must fail on the pre-fix tree for:

1. solver and validator are not inside an open seating transaction;
2. freeze compilation is not inside an open seating transaction;
3. launch still writes one run and replays the same command;
4. redirect remains after commit (existing wrapper test).

---

## Packet 8 confirmation

On live SHA `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`, five correlated Gate E samples showed launch POST → 303 at 2342–2931ms and solver time 11–17ms. Launch still completes solver, independent validation and terminal persistence before the 303. **No queue, worker, or sibling process was introduced**, because measured Branch B was corrected and the ratified live `<3s` acknowledgement target passed on the synchronous path. See `MD_PR_S073_PACKET_7_GATE_E_TIMING.md`.
