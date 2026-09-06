# Live Runtime Configuration

**Slice-ID:** MD-LV1  
**Railway project:** `atelier-doclar`  
**Service:** `control-tower`  
**Secret values:** not recorded. Status only.

## Variable status

| Variable | Status | Source |
|----------|--------|--------|
| `NODE_ENV` | CONFIGURED | Railway service variable (`production`) |
| `PORT` | CONFIGURED | Railway runtime |
| `PROGRAMME_LIVE_DEPLOYMENT` | CONFIGURED | Railway service variable |
| `PROGRAMME_AUTH_MODE` | CONFIGURED | Railway service variable (`TEMPORARY_LIVE_VERIFICATION`) |
| `PROGRAMME_SESSION_TTL_SECONDS` | CONFIGURED | Railway service variable (`7200`) |
| `PROGRAMME_SESSION_SECRET` | CONFIGURED | Railway service variable (generated, not committed) |
| `PROGRAMME_ACCESS_TOKEN` | CONFIGURED | Railway service variable (generated, not committed) |
| `DATABASE_URL` | CONFIGURED | Railway reference `${{Postgres.DATABASE_URL}}` |
| `PROGRAMME_GITHUB_LIVE` | CONFIGURED | Railway service variable (`1`) |
| `PROGRAMME_GITHUB_TOKEN` | CONFIGURED | Railway service variable (operator GitHub token, not committed) |
| `PROGRAMME_GITHUB_WEBHOOK_SECRET` | CONFIGURED | Railway service variable (generated, not committed) |
| `PROGRAMME_BASE_URL` | CONFIGURED | Railway service variable (public origin) |
| `PROGRAMME_ALLOW_FIXTURES` | NOT CONFIGURED | Intentionally absent on live |

## Authentication

Mode: **TEMPORARY_LIVE_VERIFICATION**. Permanent IdP: **NOT CONFIGURED**.

Revoke live access by rotating `PROGRAMME_ACCESS_TOKEN` or `PROGRAMME_SESSION_SECRET` in Railway. Do not paste those values into git or chat transcripts.

## Persistence

Provider: Railway PostgreSQL plugin inside `atelier-doclar` only. Adapter: `PostgresProgrammeStore`. Audit: `PostgresAuditRepository`. Webhook replay: `programme_deliveries`.

Event OS uses the same Postgres plugin through `platform_*` tables when `DATABASE_URL` is configured on service `event-os`. That does not share Control Tower event truth. See `docs/control/EVENT_OS_PRODUCTION_CONFIGURATION.md`.

## Build

GitHub-sourced deploys use Railpack with the root `package.json` `build` / `start` scripts. `railway.toml` is not used (Config as Code is retired for this new service). `NODE_ENV=production` remains a runtime variable only.

## GitHub

Live read client enabled for `kglaw-Oluseyi/atelier-doclar` only. Remote webhook hook ID `674900340` points at `/api/programme/github/webhook`.
