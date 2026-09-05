# Production configuration contract

**Slice:** MD-FC1  
**Secrets:** none in this document. No real values.

The Control Tower fails closed in `NODE_ENV=production` when security-critical variables are absent or are synthetic development placeholders.

Machine evaluation: `evaluateRuntimeConfig` in `@maison-doclar/programme-tower`.

## Required in production

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Must be `production` for a live deploy |
| `PROGRAMME_SESSION_SECRET` | HMAC session material. Must not contain `not-for-production` |
| `PROGRAMME_ACCESS_TOKEN` | Shared access token until a production IdP is selected. Must not be the synthetic development token |

## Optional

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port. Default `3010`. Railway injects `PORT` |
| `PROGRAMME_BASE_URL` | Public origin for later live verification |
| `PROGRAMME_DATA_DIR` | Durable local directory for audit JSONL, webhook deliveries and optional event store |
| `PROGRAMME_GITHUB_TOKEN` | Fine-grained read token for `kglaw-Oluseyi/atelier-doclar` only |
| `PROGRAMME_GITHUB_LIVE` | `1` enables the live GitHub read client. Never implied in tests |
| `PROGRAMME_GITHUB_WEBHOOK_SECRET` | GitHub webhook HMAC secret. Absence means webhook is UNCONFIGURED |
| `PROGRAMME_RAG_CACHE` | `memory` (default) or `file` |
| `PROGRAMME_ALLOW_FIXTURES` | View-state fixtures for automated tests. Forbidden when `PROGRAMME_LIVE_DEPLOYMENT=1` |
| `PROGRAMME_LIVE_DEPLOYMENT` | `1` requires `DATABASE_URL` and forbids fixtures |
| `PROGRAMME_AUTH_MODE` | `TEMPORARY_LIVE_VERIFICATION` until a production IdP is selected |
| `PROGRAMME_SESSION_TTL_SECONDS` | Production default `7200` |
| `DATABASE_URL` | PostgreSQL connection for live persistence |

## Fail-closed rules

- Missing session secret or access token in production → not ready (HTTP 503 on `/api/health/ready`).
- Synthetic `*-not-for-production` secrets in production → not ready.
- `PROGRAMME_GITHUB_LIVE=1` without a token → not ready.
- Liveness (`/api/health/live`) remains true if the process is up.

## Persistent-service dependencies

Live MD-LV1 persistence is PostgreSQL via `DATABASE_URL`. Local/CI without `DATABASE_URL` continues to use corpus-seed memory and optional `PROGRAMME_DATA_DIR` files. Fixtures must stay off on the live service.
