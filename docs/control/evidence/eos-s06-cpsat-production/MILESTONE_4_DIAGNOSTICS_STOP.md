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
