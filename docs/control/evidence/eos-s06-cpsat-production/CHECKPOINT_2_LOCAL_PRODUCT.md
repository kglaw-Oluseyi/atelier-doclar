# Checkpoint 2 — CP-SAT Local Product Evidence

**Disposition:** see `CHECKPOINT_2_COMPLETION.md`  
**Starting HEAD:** `df6d6a616ccf769e86020a94c0f5281002137292`  
**Governance commit:** `11feb11d0dfd2dbef5748e4df23f504e0b586235`  
**Pack SHA-256:** `9d41447846109a55ee95c641686d3aa239188801bfcc5c19d0656e3470870c74`

## Controlled build condition (Checkpoint 2A) — CLOSED

See `container-build/`:

| Item | Value |
|---|---|
| Image tag | `event-os-solver-worker:cpsat-cp2a` |
| Image id | `sha256:3dc087c901e3471e45db9e86e36274c2de39e185f11eacec7ac814cd92d3469a` |
| Arch | `linux/amd64` |
| Size | ~175.1 MiB |
| Python | `3.12.14` (image) / local venv may be `3.12.13` host |
| OR-Tools | `9.15.6755` |
| User | non-root `solver` (uid 10001) |
| Ingress | none |

## B_TYPICAL regression (immutable corpus)

| Check | Result |
|---|---|
| Corpus hash | `13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668` unchanged |
| Product | `FEASIBLE` (Replay) |
| Seated | 1000/1000 |
| Verifier | PASS |
| Explanations | 100% non-empty for eligible guests |
| `g0146`/`g0147` | same table |
| Misclassified TIMED_OUT | no |
| Heuristic comparator | still TIMED_OUT / incomplete (defect preserved) |

## Contracts

- `md.seating.solve.request/1`
- `md.seating.solve.response/1`
- Model `cpsat-model-v1`
- Explanation edition `cpsat-explain-v1`

## Local product surfaces delivered

- Compiler (D1 together, zones, Hall-family attr domains, block-reservation domain force)
- Independent TS verifier (`cpsat-verifier/`, no compiler import)
- Python Stage A + Stage B + Hall-family capacity on attributes
- Local child solve path (`solveSeatingV2CompiledCpSat`)
- Adapter: CP-SAT authoritative; heuristic via `SEATING_ENGINE=heuristic` only
- PostgreSQL queue schema migration `011_cpsat_solver_queue`
- Queue claim/heartbeat/fence SQL helpers
- UI status panel + copy rules (no % complete / ETA / false optimality)
- Resumable qualification shard runner
- Chaos tests: truncated frame, SIGTERM cancel, forbidden env

## Explicitly not done in Checkpoint 2

- No Railway `event-os-solver-worker` service created
- No Event OS deployment
- No live data / fixture mutation
- No production authority switch (`productionAuthorised` remains false)
- Full 10k oracle / 480 planted / mutation-score ≥90% matrix not fully executed in this environment — resumable runner present; development + B_TYPICAL + scale-50/600 evidence captured
- Full ephemeral-PG supervisor claim loop end-to-end chaos matrix partially covered (SQL + child chaos; full multi-worker lease race deferred)
- Heuristic not removed (comparator only)
