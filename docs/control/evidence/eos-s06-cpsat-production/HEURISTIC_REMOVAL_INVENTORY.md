# Heuristic removal inventory (Checkpoint 2 preparation)

Heuristic remains **comparator only**. Do not remove until Checkpoint 3 authority.

## Authoritative path (CP-SAT)

| Call site | Path | Notes |
|---|---|---|
| `solveSeatingV2Compiled` | `packages/shared-platform/src/seating-v2-solver-adapter.ts` | Default → `solveSeatingV2CompiledCpSat` |
| `launchRun` | `packages/shared-platform/src/seating-v2-command-service.ts` | Awaits async CP-SAT |

## Comparator / legacy call sites (remove in Checkpoint 3)

| Call site | Path | Action at removal |
|---|---|---|
| `solveSeatingV2CompiledHeuristic` | `seating-v2-solver-adapter.ts` | Delete export |
| `solveSeatingV1` / `seating-solver-v1` | `seating-solver-v1.ts` | Delete module after comparator evidence archived |
| `SEATING_ENGINE=heuristic` branch | `seating-v2-solver-adapter.ts` | Delete env switch |
| S075 differential / claim / namespace tests | `test/seating-v2-s075-*.test.ts` | Retarget to CP-SAT or archive as historical |
| Capacity-1000 heuristic qualification | `seating-capacity-1000-*`, event-os scripts | Replace with CP-SAT qualification evidence |
| Any UI engine selector exposing heuristic | (none found for selectable engine) | Keep absent |

## Fallback paths to eliminate

1. Any catch/retry that re-invokes heuristic after CP-SAT fault — **must not exist**.
2. Any adoption path that accepts heuristic `rawOutputHash` as authority — **must not exist**.
3. Emergency `SEATING_ENGINE=heuristic` in production env — **forbid**.

## Comparator evidence captured

- B_TYPICAL: CP-SAT `FEASIBLE` 1000/1000; heuristic remains timed out / incomplete (legacy defect).
- Tiny together: CP-SAT optimal/feasible with verifier + explanations.

## Removal plan (Checkpoint 3)

1. Freeze comparator report JSON under evidence.
2. Delete heuristic exports and `seating-solver-v1` if unused elsewhere.
3. Grep CI for `solveSeatingV1|SEATING_ENGINE=heuristic|solveSeatingV2CompiledHeuristic`.
4. Fail CI if any match outside archived evidence.
