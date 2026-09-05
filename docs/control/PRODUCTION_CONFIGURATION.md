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
| `PROGRAMME_ALLOW_FIXTURES` | View-state fixtures for automated tests. Not an operator tool |

## Fail-closed rules

- Missing session secret or access token in production → not ready (HTTP 503 on `/api/health/ready`).
- Synthetic `*-not-for-production` secrets in production → not ready.
- `PROGRAMME_GITHUB_LIVE=1` without a token → not ready.
- Liveness (`/api/health/live`) remains true if the process is up.

## Persistent-service dependencies

The Next.js process is stateless except for files under `PROGRAMME_DATA_DIR`. A live Railway deploy needs a volume or the selected production database (`CT2-OI-001`) before treating persistence as AVAILABLE beyond `LOCAL_ONLY`.
