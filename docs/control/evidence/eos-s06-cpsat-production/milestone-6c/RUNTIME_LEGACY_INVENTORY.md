# M6C — Runtime legacy seating inventory

Event OS baseline SHA: `9746b1749e579a720c4f720c8f578d27166d0d39`

| Path/symbol | Read/write | Current purpose | Required action |
| ----------- | ---------- | --------------- | --------------- |
| `seating_v2_runs` table | historical R | Prior V2 run mirror | HISTORICAL EVIDENCE — RETAIN READ-ONLY |
| `seating_v2_publications` / `event_current` | historical R | Prior V2 publication pointer | HISTORICAL EVIDENCE — RETAIN READ-ONLY |
| `projectSeatingV2Lifecycle` | write (retired) | Dual-write lifecycle into `seating_v2_runs` | REMOVE (no-op retained) |
| `SeatingV2CommandService.launchRun` → `tx.insert("runs")` | write (retired) | Mirror CP-SAT enqueue into V2 runs | REMOVE |
| `SeatingV2CommandService.projectWorkspace` legacy publication | read (retired) | Surface V2 CURRENT publication | REPLACE WITH CP-SAT |
| Event OS seating page `projectCurrentPublication` fallback | read (retired) | Legacy publication badge | REMOVE |
| `LEGACY_S06_PUBLICATION_LABEL` on operational surfaces | UI | Labelled legacy as current | REMOVE FROM RUNTIME |
| `adoptSeatingRunAction` / `publishSeatingPlanAction` | write | Legacy adopt/publish product entry | REMOVE FROM RUNTIME (throws) |
| `SeatingV2CommandService.adoptRun` / `publishPlan` | write | V2 fixture/history helpers | MIGRATION/EVIDENCE ONLY (not Event OS product) |
| `solveSeatingV1` / heuristic adapter | write | In-process / heuristic solve | REMOVE FROM RUNTIME (fail-closed) |
| `SEATING_ENGINE` / `SOLVER_QUEUE_ENABLED` | config | Engine selector / queue toggle | REMOVE FROM RUNTIME |
| `cpsat_solver_runs` + candidates + assignments | R/W | Canonical operational runs | REPLACE WITH CP-SAT (authoritative) |
| `cpsat_solver_adoptions` + `cpsat_solver_authority_pointers` | R/W | Canonical publication | REPLACE WITH CP-SAT (authoritative) |
| `cpsat_solver_workers` / admission | R | Worker readiness | REPLACE WITH CP-SAT (authoritative) |
| Evaluation `seating.evaluate` via protection form | R/W | Corpus evaluation + audit | REPLACE WITH CP-SAT (message/audit fixed) |
| Pre-CP-SAT seating rows in DB | R | Audit/compliance history | MOVE TO EXPLICIT HISTORY ADAPTER (DB retain; no operational UI) |

Classification summary:

- **ACTIVE LEGACY — REMOVE FROM RUNTIME**: dual-write lifecycle, launch mirror, UI legacy fallback, product adopt/publish actions, heuristic engine selection.
- **HISTORICAL EVIDENCE — RETAIN READ-ONLY**: `seating_v2_*` tables, prior approvals/publications/audit events.
- **UNUSED — SAFE FOR LATER PHYSICAL REMOVAL**: none proven; physical drops deferred past M6C.
