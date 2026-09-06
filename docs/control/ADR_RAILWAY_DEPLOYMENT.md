# ADR — Railway readiness for the Control Tower

**Status:** Target deployed in MD-LV1  
**Slice:** MD-FC1 / MD-LV1  
**Related:** `CT4-OI-002` RESOLVED; `OI-CT0-004` hosting resolved, IdP remains open

## Intended target

CEO-identified Railway project: **`atelier-doclar`**.

MD-FC1 did not contact Railway. MD-LV1 deployed the Control Tower to this project only. Live URL: `https://control-tower-production-dbc4.up.railway.app/programme`.

## Application contract

| Concern | Preparation |
|---------|-------------|
| Production build | `pnpm --filter @maison-doclar/control-tower build` |
| Start | `pnpm --filter @maison-doclar/control-tower start` honours `PORT` |
| Liveness | `GET /api/health/live` |
| Readiness | `GET /api/health/ready` fails closed in production without required secrets |
| Environment | `docs/control/PRODUCTION_CONFIGURATION.md` |
| Secrets | none committed |
| Process | stateless except `PROGRAMME_DATA_DIR` |
| Persistence | local JSONL until PostgreSQL is authorised (`ADR_PRODUCTION_PERSISTENCE.md`) |
| Nixpacks | `railway.toml` at repository root |

## Persistent-service dependencies (explicit)

- Optional volume for `PROGRAMME_DATA_DIR` if filesystem adapters are used before PostgreSQL.
- PostgreSQL plugin when `CT2-OI-001` is decided.
- GitHub webhook (created in a later slice, not this one).
- Production IdP when `CT4-OI-001` is decided.

**CONTROL TOWER PRODUCTION AUTHORISED: NO**

## Supersession — Event OS deploy-by-default (6 September 2026)

**Former restriction:** MD-FC1 did not contact Railway; Event OS slices later treated Railway mutation as unauthorised.

**Status:** SUPERSEDED for Event OS service `event-os` in project `atelier-doclar`. Control Tower production operations remain unauthorised.

**Current policy:** `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md`

**Safeguards retained:** Other Railway projects, real client operations, force-push, and protected gates remain gated. Event OS persistence uses the same Postgres plugin via `platform_*` tables, not Control Tower `programme_*` tables.
