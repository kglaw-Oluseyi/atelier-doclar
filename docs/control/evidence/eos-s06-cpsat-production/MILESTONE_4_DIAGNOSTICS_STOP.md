# CP-SAT Milestone 4 — Infeasibility diagnostics, counterfactuals and stop-keep-best

- **Disposition:** MILESTONE 4 COMPLETE (local synthetic proof)
- **Date:** 2026-09-17
- **Starting HEAD:** `9f58297e57244697b5825cf84bc3f28201fb8b28`
- **origin/main (unchanged during implementation):** `9f58297e57244697b5825cf84bc3f28201fb8b28`
- **Product commit:** `0d9f6da3410300a1b57a791211158e2515e9f8e8` (`feat(cpsat): add diagnostics and stop-keep-best`)
- **Evidence commit:** this document (`docs(cpsat): record diagnostics and stop milestone`)

## Migrations

- `011_cpsat_solver_queue` (existing)
- `012_cpsat_solver_queue_launch` (existing)
- `013_cpsat_solver_queue_worker` (existing)
- `014_cpsat_solver_review_adoption` (existing)
- `015_cpsat_solver_diagnostics` (additive):
  - run: `stop_mode`, stop timestamps, incumbent/solutions/objective/gap/time fields, confirmation hashes, diagnostic phase/class
  - infeasibility evidence columns (layer, grade, core/MCS/MAXSEAT facts, diagnostic-only marker)
  - `cpsat_solver_counterfactuals` table with cache key

## Railway / publication control observation (open)

Event OS `watchPatterns` were observed as empty immediately before Milestone 4. No Railway mutation was performed because Milestone 4 was local-only. A verified deployment guard is required before any later GitHub push or deployment action.

Railway was not accessed after the corrected authorisation to resume local implementation.

## Diagnostic evidence model

| Layer | Type | Grade when valid |
|-------|------|------------------|
| L0 | `EMPTY_DOMAIN`, `LOCKS_SPLIT_UNIT`, `APART_WITHIN_UNIT`, `TOTAL_CAPACITY` | `CERTIFIED` (TS recheck) |
| L1 | `HALL_VIOLATION` | `CERTIFIED` |
| L1′ | `APART_PIGEONHOLE` | `CERTIFIED` (concrete clique rechecked) |
| L2 | native full-model `INFEASIBLE` | not presented until L3 |
| L3 | confirmation Replay + different seed | agreement → ≥ `SOLVER_PROOF`; assignment → `SOLVER_FAULT(INCONSISTENT_PROOF)` |
| L4 | `DIAG_CORE` / `DIAG_MCS` / `DIAG_MAXSEAT` | diagnostic-only; never adoptable |

Failed certificate checks create immutable `cpsat_solver_incidents` and never claim infeasibility.

## Certificate examples (synthetic)

- Apart-within-together → `APART_WITHIN_UNIT` + independent TS recheck PASS
- Mutated Hall arithmetic → `SOLVER_FAULT(INCONSISTENT_PROOF)`
- Empty require-table domain → `EMPTY_DOMAIN` CERTIFIED without Python

## Confirmation evidence

- Dual INFEASIBLE probe → `SOLVER_PROOF`
- Confirmation FEASIBLE → inconsistent-proof incident path
- `DIAG_*` / restricted purposes never become authoritative INFEASIBLE

## CORE / MCS / MAXSEAT

- Certificate-seeded CORE/MCS guidance persisted as rule references (no prose)
- MAXSEAT optimal vs best-found operator wording codes
- `diagnostic_only=true`; no adoption/publication actions

## Counterfactuals

- Forbidden table → `PROHIBITED_VISIBLE_RULE`
- Restricted refs redacted for Planner
- Stale authority → `CANDIDATE_STALE`
- Cache scoped by candidate + authority hashes + guest/table + engine + budget edition
- Auditor cannot launch

## Stop modes

- `CANCEL` preserves prior `cancel_requested` behaviour
- `KEEP_BEST` requires `solutions_found > 0` / incumbent; diagnostic runs rejected
- Idempotent re-request; `stop_mode` persisted after refresh
- UI hides KEEP_BEST at zero solutions; confirm copy states discard vs verify-before-review

## Focused tests

```text
cd packages/shared-platform
npx tsx --test \
  test/cpsat-diagnostics-stop.test.ts \
  test/cpsat-m4-journeys.test.ts \
  test/cpsat-worker-settlement.test.ts \
  test/cpsat-operator-lifecycle-ui.test.ts \
  test/cpsat-review-adoption-ui.test.ts \
  test/cpsat-review-adoption.test.ts
```

**Result:** 65/65 pass (local run 2026-09-17). Real CP-SAT child executions in this milestone proof: **0** (mocked probes; budget of 6 reserved unused).

## Synthetic journeys

| Journey | Result |
|---------|--------|
| A static certified conflict | CERTIFIED `APART_WITHIN_UNIT`, correction guidance, no Python |
| B full-model infeasible | confirmation + MCS/MAXSEAT persisted; not adoptable |
| C stop keep-best | `stop_mode=KEEP_BEST` with incumbent |
| D counterfactual | sealed identity unchanged; verified prohibition code |

Synthetic IDs only (`cpsat_m4_*` / `cpsat_m4j_*` ephemeral DBs).

## Frontend / source checks

- `cpsat-run-status-panel.tsx`: cancel + stop-keep-best, infeasibility panel, auditor gating, mobile-safe diagnostics
- `cpsat-candidate-review-panel.tsx`: counterfactual states panel; auditor blocked
- `ui-model.ts`: truthful incomplete/timeout/certified wording; `stopAndKeepBestAllowed`

## Safety

- Synthetic data only
- Local/ephemeral PostgreSQL only
- No production database access
- No Railway access after corrected authorisation; no Railway configuration changed
- No push / no deploy
- `productionAuthorised` unchanged (false)
- No Control Tower / EOS-S06B / S06D / S07 / CAP1000 qualification work
- Unrelated CAP1000 / qualification dirty paths untouched
- No heuristic retirement
- No real guest data

## Remaining (explicitly out of scope)

- Final heuristic retirement
- Worker supply-chain/security packaging
- Railway worker deployment
- Production Event OS queue integration
- Frozen-candidate qualification
- Claude browser verification
- Rollback drill
- CP-SAT acceptance
- S06C acceptance
- S06B/S06D later
- Verified Event OS deployment guard before any GitHub push

---

## Milestone 4A — Real execution closure (2026-09-17)

**Disposition of this correction:** MILESTONE 4 REAL EXECUTION COMPLETE (local synthetic proof; not formal qualification)

**Truth retained from original Milestone 4 evidence:** the product/UI commits below shipped with **mocked diagnostic probes**. That remains accurate for commits `0d9f6da` and `879fe89`. This section records the additive real-execution closure that followed; those commits were **not** amended.

| Item | Value |
|------|--------|
| Original product commit | `0d9f6da3410300a1b57a791211158e2515e9f8e8` — diagnostics/stop product |
| Original evidence commit | `879fe89f830ec0da942af930421304153b3e0c90` — diagnostics/stop evidence |
| Real-execution correction commit | `43d5d20` — `fix(cpsat): complete real diagnostic and stop execution` |
| Real-execution evidence commit | *(this evidence commit)* `docs(cpsat): close milestone 4 real execution evidence` |
| Real tiny CP-SAT child executions (local proof) | **8** (cap 10) |

### What was proven with the real Python child

1. **Full-model confirmation** — genuine second Replay solve with a different signed-int32 seed; dual `INFEASIBLE` → `SOLVER_PROOF`.
2. **DIAG_CORE** — OR-Tools `AddAssumptions` + `SufficientAssumptionsForInfeasibility` (literal `Index()` mapped to rule refs) + deletion minimisation re-solves; TypeScript maps refs and rechecks.
3. **DIAG_MCS** — genuine priority-weighted correction-set maximisation; diagnostic assignment returned; `diagnostic_only`.
4. **DIAG_MAXSEAT** — genuine maximum-seating Stage A; seated count ≤1 on apart/single-table fixture; non-adoptable.
5. **Counterfactual** — `COUNTERFACTUAL` purpose + forced `guestIndex`/`tableIndex` on the child request; candidate unchanged.
6. **KEEP_BEST** — real stop frame (`type=stop`, `mode=KEEP_BEST`) while child runs; stdin kept open; `StopSearch`; incumbent → verify/seal → `FEASIBLE` + `OPERATOR_STOP` + `READY_FOR_REVIEW`.
7. **Production default** — `executeClaimedCpsatRun` binds `createRealChildFeasibilityProbe`; no env-var mock selection.

### Focused regression

```text
cd packages/shared-platform
npx tsx --test test/cpsat-m4a-real-execution.test.ts
npx tsx --test test/cpsat-diagnostics-stop.test.ts test/cpsat-m4-journeys.test.ts
npx tsx --test test/cpsat-worker-settlement.test.ts
```

Results (local 2026-09-17): M4A 6/6; prior M4 mocked suites 21/21; M2 settlement 13/13.

### Remaining limitations (honest)

- Not formal qualification; no CAP1000 / 600–2000 fixtures.
- MCS independent verification uses assignment completeness + relaxable-set membership (no second planning child in the budgeted journey).
- `testHooks.continueAfterIncumbentMs` is test-only timing control; it does not fabricate incumbents.
- OR-Tools `StopSearch` from the stdin-control thread is supported on installed 9.15.6755; confirmed before KEEP_BEST proof.
- Railway / production PostgreSQL / push / deploy still out of scope.
