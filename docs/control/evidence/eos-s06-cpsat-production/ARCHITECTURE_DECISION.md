# Architecture decision — CP-SAT seating

**Status:** CEO RATIFIED (pack `01_CP_SAT_Architecture_Decision.docx`)
**Service:** `event-os-solver-worker` in Railway project `atelier-doclar` / `production`

## Decision

Deploy a second Railway service with **no HTTP/RPC/private listening ingress**. Jobs are claimed from PostgreSQL. A long-lived TypeScript supervisor starts one short-lived Python OR-Tools CP-SAT child per solve. Framed canonical JSON: stdin request; dedicated fd 3 response.

## Component ownership

| Component | Owns | Must never |
|-----------|------|------------|
| Event OS web | Authority, freeze, permissions, launch, review, adoption, UI | Execute CP-SAT |
| PostgreSQL | Jobs, leases, evidence, candidates, adoption pointer | Accept unfenced settlement |
| TS supervisor | Claims, isolation, verification, explanations, settlement | Trust child output |
| Python child | Schema validation, model, solve, progress | DB, network, names/contacts |
| TS verifier | Independent invariants | Import compiler/solver modules |

## Rejected alternatives

Solving in the web container; long-lived Python owning the DB; RPC solver service; unofficial Node binding / WebAssembly for authoritative production.
