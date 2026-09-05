# ADR — Railway readiness for the Control Tower

**Status:** Intended target recorded; deployment not performed  
**Slice:** MD-FC1  
**Related:** `CT4-OI-002`, `OI-CT0-004`

## Intended target

CEO-identified Railway project: **`atelier-doclar`**.

This slice does not contact Railway and does not deploy.

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
