# Heuristic retirement inventory (Checkpoint 2)

Checkpoint 3 path only — **do not remove from production runtime in Checkpoint 2**.

Classification key:

- `REMOVE` — delete at authority switch
- `REPLACE WITH CP-SAT` — retarget to CP-SAT API
- `RETAIN AS HISTORICAL TEST EVIDENCE` — keep read-only
- `RETAIN AS NON-AUTHORITATIVE COMPARATOR` — temporary until switch
- `REQUIRES OWNER DECISION` — needs explicit Checkpoint 3 call

## Imports / modules

| Item | Path | Class |
|---|---|---|
| `solveSeatingV1` | `packages/shared-platform/src/seating-solver-v1.ts` | REMOVE |
| `compareLexicographic` / `assertSolverRequest` / `defaultSolverConfig` | `seating-solver-v1.ts` | REMOVE (or retain types only if still used by evidence scripts → RETAIN AS HISTORICAL) |
| Export barrel | `packages/shared-platform/src/index.ts` (`solveSeatingV1`, …) | REMOVE |
| `solveSeatingV2CompiledHeuristic` | `seating-v2-solver-adapter.ts` | REMOVE |
| `SEATING_ENGINE=heuristic` branch in `solveSeatingV2Compiled` | `seating-v2-solver-adapter.ts` | REMOVE — must become hard reject / no fallback |
| Heuristic types in `seating-solver-types.ts` | shared-platform | REMOVE unless historical scripts need them → REQUIRES OWNER DECISION |

## Service methods / API routes / queue consumers / commands

| Item | Path | Class |
|---|---|---|
| Event OS seating solve command path | adapter → currently CP-SAT authoritative | REPLACE WITH CP-SAT (already); remove heuristic env escape |
| Queue consumer for seating | CP-SAT queue schema `011_cpsat_solver_queue` | REPLACE WITH CP-SAT (already) — no heuristic consumer found |
| API route exposing heuristic authority | none found | — (keep absent) |
| CLI / scripts invoking `solveSeatingV1` | `b-typical-feasibility-diagnosis*.ts`, `b-typical-global-feasibility-witness.ts`, `seating-capacity-1000-*` | RETAIN AS HISTORICAL TEST EVIDENCE (freeze; do not use as authority) |
| event-os `s06-capacity-1000-*` scripts | `apps/event-os/scripts/` | RETAIN AS HISTORICAL TEST EVIDENCE |

## Tests / fixtures

| Item | Path | Class |
|---|---|---|
| `seating-v2-s075-*.test.ts` heuristic calls | shared-platform/test | REPLACE WITH CP-SAT or RETAIN AS HISTORICAL TEST EVIDENCE |
| `seating-capacity-1000-qualification.test.ts` | shared-platform/test | RETAIN AS HISTORICAL TEST EVIDENCE |
| `cpsat-core.test.ts` comparator vs heuristic timeout | shared-platform/test | RETAIN AS NON-AUTHORITATIVE COMPARATOR until switch, then REMOVE comparator leg |
| CAP1000 fixtures / corpus | `seating-capacity-1000-corpus.ts` | RETAIN AS HISTORICAL TEST EVIDENCE (immutable B_TYPICAL hash) |

## UI labels / status mapping

| Item | Class |
|---|---|
| No heuristic engine selector in Event OS UI | keep absent |
| `CpsatRunStatusPanel` / `cpsat/ui-model.ts` | REPLACE WITH CP-SAT (already) |
| Any “heuristic” copy in operator UI | none found — REMOVE if introduced |

## Feature flags / fallbacks

| Item | Class |
|---|---|
| `SEATING_ENGINE=heuristic` | REMOVE at switch; until then RETAIN AS NON-AUTHORITATIVE COMPARATOR for harness only |
| Catch/retry falling back to heuristic after CP-SAT fault | PROHIBITED — REMOVE if present (none found) |
| Dual-authority mode | PROHIBITED — REMOVE |

## Evidence / operational / deployment

| Item | Class |
|---|---|
| `COMPARATOR_REPORT.md`, legacy defect provenance, B_TYPICAL witness | RETAIN AS HISTORICAL TEST EVIDENCE |
| Heuristic 1000-seat qualification evidence under eos-s06-capacity-1000 | RETAIN AS HISTORICAL TEST EVIDENCE |
| Railway / deployment depending on heuristic solver | none — CP-SAT worker not yet deployed (Checkpoint 2) |
| Ops runbooks mentioning heuristic seating | REQUIRES OWNER DECISION to rewrite at Checkpoint 3 |

## Unresolved owner decisions

1. Whether S075 heuristic tests are deleted vs archived under `test/historical/`.
2. Whether `solveSeatingV1` remains importable behind `md.historical` namespace for evidence replay.
3. Exact CI grep-fail patterns for post-switch (`SEATING_ENGINE=heuristic`, `solveSeatingV2CompiledHeuristic`).

## Bounded Checkpoint 3 path

1. Make `solveSeatingV2Compiled` CP-SAT-only; delete `SEATING_ENGINE` branch; on worker unavailable → safe reject (`SOLVER_FAULT` / queue NACK), never heuristic.
2. Remove heuristic exports from public barrel; move historical scripts to evidence-only package path.
3. Rollback = prior deployment version (single authority), not dual-solver toggle.
4. Keep historical evidence trees immutable; no executable production fallback.
5. CI gate: fail if heuristic authority symbols appear outside archived paths.
