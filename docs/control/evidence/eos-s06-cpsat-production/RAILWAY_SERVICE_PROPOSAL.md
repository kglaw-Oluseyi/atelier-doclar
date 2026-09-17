# Railway service configuration proposal — event-os-solver-worker

**Status:** Proposal only (Checkpoint 1). Service **not created**.
**Project:** `atelier-doclar` (`c1c937b7-2660-4fc2-8257-c08bd6346658`)
**Environment:** `production` (`6d70f804-d3c7-4255-88c3-cc86531251ef`)
**Existing services (untouched):** `event-os`, `control-tower`, Postgres, layout-assets bucket

## Required identity

| Field | Value |
|-------|-------|
| Service name | `event-os-solver-worker` exactly |
| Root directory | `apps/event-os-solver-worker` |
| Builder | Dockerfile (`apps/event-os-solver-worker/Dockerfile`) |
| Public networking | **None** — no public domain |
| Private HTTP/RPC | **None** — no listening application port |
| Healthcheck path | **None** (no web port); rely on process supervision / restart policy |
| Restart | On failure; drain claims before SIGTERM (P2) |

## Variables (names only — no secrets in chat)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` or dedicated solver role URL | Least-privilege PostgreSQL (solver tables + frozen snapshots only) |
| `SOLVER_PYTHON` | Path to Python 3.12 |
| `SOLVER_CHILD_SCRIPT` | Path to `solver_child.py` |
| `SOLVER_INGRESS=none` | Explicit no-ingress marker |
| Do **not** copy | Provider / communications secrets from `event-os` |
| Do **not** set | `productionAuthorised=true` |

## Outbound

Limited to authorised database and required platform operations. No provider or Control Tower dependency.

## Local-edge compatibility

Same Dockerfile image digest; local PostgreSQL; x86-64 reference hardware for replay equivalence; holder-epoch authority transfer (P9). Packaging feasibility: **yes** via identical signed image.

## Creation gate

Do not create this Railway service until Checkpoint 3 deployment authority (or an explicit reversible build-only proof instruction).
