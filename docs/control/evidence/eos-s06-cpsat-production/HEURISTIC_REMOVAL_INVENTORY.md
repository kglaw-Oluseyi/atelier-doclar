# Heuristic retirement inventory (Checkpoint 2)

## Entry points / runtime

| Item | Path | Class |
|---|---|---|
| `solveSeatingV1` | `packages/shared-platform/src/seating-solver-v1.ts` | TEMPORARY COMPARATOR → REMOVE AT AUTHORITY SWITCH |
| `solveSeatingV2CompiledHeuristic` | `packages/shared-platform/src/seating-v2-solver-adapter.ts` | TEMPORARY COMPARATOR → REMOVE AT AUTHORITY SWITCH |
| `SEATING_ENGINE=heuristic` branch | `seating-v2-solver-adapter.ts` `solveSeatingV2Compiled` | PROHIBITED FALLBACK (must not exist in prod) |
| `defaultSolverConfig` / heuristic types | `seating-solver-types.ts`, `seating-solver-v1.ts` | REMOVE AT AUTHORITY SWITCH |
| Capacity-1000 heuristic runners | `seating-capacity-1000-*`, event-os `s06-capacity-1000-*` scripts | PRESERVE HISTORICAL READ ONLY (evidence) / REMOVE runtime authority |
| S075 tests calling heuristic | `test/seating-v2-s075-*.test.ts` | TEMPORARY COMPARATOR → retarget CP-SAT or archive |

## UI / API / flags

| Item | Class |
|---|---|
| No selectable heuristic engine in Event OS UI | (none found) — keep absent |
| Feature flag for heuristic as authority | PROHIBITED FALLBACK — do not add |
| API route exposing heuristic solve | none for authority — REMOVE any if discovered at switch |

## Scheduled / background

| Item | Class |
|---|---|
| None found scheduling heuristic seating | — |

## Tests / evidence readers

| Item | Class |
|---|---|
| CAP1000 qualification tests vs heuristic | PRESERVE HISTORICAL READ ONLY |
| Comparator report `COMPARATOR_REPORT.md` | PRESERVE HISTORICAL READ ONLY |
| B_TYPICAL global displacement witness | PRESERVE HISTORICAL READ ONLY |

## Fallback branches

| Item | Class |
|---|---|
| Catch/retry that falls back to heuristic after CP-SAT fault | PROHIBITED FALLBACK — must not exist |
| Adoption of heuristic `rawOutputHash` as authority | PROHIBITED FALLBACK |

## Final retirement rule

At Checkpoint 3 authority switch: delete comparator exports, env switch, and CI-fail on `solveSeatingV1|SEATING_ENGINE=heuristic|solveSeatingV2CompiledHeuristic` outside archived evidence.
