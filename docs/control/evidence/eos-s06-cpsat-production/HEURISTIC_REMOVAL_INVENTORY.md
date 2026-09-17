# Heuristic retirement inventory (Milestone 5 — final disposition)

Classification key:

- `production authoritative` — must remain on the product path
- `production fallback` — prohibited; remove
- `production in-process CP-SAT` — prohibited on Event OS product path
- `historical evidence` — retain read-only evidence trees
- `explicit test comparator` — importable only via explicit non-product path
- `qualification-only` — scripts/harnesses outside production package commands
- `dead/unreachable` — leave or delete only if safe
- `package-export leakage` — remove from public barrel

## Environment / flags

| Item | Path | Disposition |
|---|---|---|
| `SOLVER_QUEUE_ENABLED` | `seating-v2-flag.ts`, command service, Event OS UI/actions | **REMOVED from product decision-making** — queue is sole entry |
| `SEATING_ENGINE=heuristic` | `seating-v2-solver-adapter.ts` | **REMOVED** — no env/engine selector |
| Operator engine selector UI | Event OS seating page / panels | **absent / keep absent** |

## Product launch graph

| Item | Path | Disposition |
|---|---|---|
| `SeatingV2CommandService.launchRun` durable enqueue | `seating-v2-command-service.ts` | **production authoritative** — always `enqueueCpsatSeatingRun` after admission |
| In-process `solveSeatingV2Compiled` after launch | `seating-v2-command-service.ts` | **production in-process CP-SAT → removed** |
| `launchSeatingRunAction` | `apps/event-os/src/server/seating-actions.ts` | **production authoritative** — queue only |
| Cancel/stop gated on `isSolverQueueEnabled` | `seating-actions.ts` | **removed gate** — always durable lifecycle |
| UI “solves with CP-SAT” vs queue copy | `seating/page.tsx` | **queue-only wording** |

## Solver symbols

| Item | Path | Disposition |
|---|---|---|
| `solveSeatingV1` | `seating-solver-v1.ts` | **explicit test comparator / historical** — not public barrel |
| `solveSeatingV2CompiledHeuristic` | `seating-v2-solver-adapter.ts` | **explicit test comparator** — deep import only |
| `solveSeatingV2Compiled` | `seating-v2-solver-adapter.ts` | **qualification-only / local harness** — not Event OS product path; no heuristic branch |
| `solveSeatingV2CompiledCpSat` / `local-solve.ts` | `cpsat/local-solve.ts` | **qualification-only / worker-adjacent harness** — not Event OS product path; not public barrel |
| Worker `runSolverChild` | `apps/event-os-solver-worker/src/child-runner.ts` | **production authoritative** — sole production Python spawn |
| Diagnostics real child probe | `cpsat/diagnostics/real-child-probe.ts` | **production authoritative** inside worker settlement only |

## Package exports (`packages/shared-platform/src/index.ts`)

| Export | Disposition |
|---|---|
| `solveSeatingV1`, `compareLexicographic`, `assertSolverRequest`, `defaultSolverConfig` | **package-export leakage → removed** |
| `solveSeatingV2CompiledCpSat` | **package-export leakage → removed** |
| `isSolverQueueEnabled` | **removed from product API** (deprecated stub may remain for tests until cleaned) |
| Capacity corpora / evaluation runners | **qualification-only** — retain; not seating launch authority |
| Durable queue / worker / review APIs | **production authoritative** |

## Fallback / catch

| Item | Path | Disposition |
|---|---|---|
| Catch after CP-SAT → heuristic | none found historically; re-verify | **PROHIBITED** |
| Worker unavailable → heuristic / local solve | admission path | **PROHIBITED** — typed `DEPENDENCY_UNAVAILABLE` |
| Dual-authority / rollback via engine toggle | — | **PROHIBITED** — deployment versioning only |

## Historical evidence (immutable)

| Item | Path | Disposition |
|---|---|---|
| B_TYPICAL / CAP1000 evidence | `docs/control/evidence/eos-s06-capacity-1000/` | **historical evidence** |
| Legacy defect provenance | `eos-s06-cpsat-production/legacy-defect-provenance/` | **historical evidence** |
| Comparator reports | `COMPARATOR_REPORT.md` | **historical evidence** |
| Qualification scripts (dirty tree) | `packages/shared-platform/scripts/*`, capacity runners | **qualification-only** — untouched in M5 |

## Tests / architectural gates

| Item | Path | Disposition |
|---|---|---|
| Heuristic S075 / V1 unit tests | `test/seating-*.test.ts` | **explicit test comparator** via deep imports |
| M5 architectural product-path test | `test/cpsat-m5-authority-packaging.test.ts` | **production authoritative** gate |
| UI no engine selector | existing `cpsat-*-ui.test.ts` | retain / strengthen |

## Final CEO dispositions (Milestone 5)

1. CP-SAT durable queue is the sole product seating launch authority.
2. Heuristic is not an emergency fallback.
3. Worker unavailability fails closed with honest operator wording.
4. Rollback = prior deployment version, not dual solver authority.
5. Historical evidence and explicit test comparators preserved, unreachable from product runtime.
