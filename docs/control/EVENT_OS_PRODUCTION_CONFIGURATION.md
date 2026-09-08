# Event OS production configuration contract

**Date:** 6 September 2026  
**Railway project:** `atelier-doclar`  
**Service:** `event-os`  
**Secrets:** none in this document. No real values.

`productionAuthorised` remains false. This contract authorises durable Railway Postgres for synthetic Event OS development. It does not authorise real client operations.

## Required on the live Event OS service

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` on Railway |
| `DATABASE_URL` | Railway Postgres reference `${{Postgres.DATABASE_URL}}` |
| `EVENT_OS_ACCESS_TOKEN` | Temporary staff access token. Must not be the local development literal |
| `EVENT_OS_SESSION_SECRET` | Staff session HMAC. Must not contain `not-for-production` |
| `EVENT_OS_RSVP_PEPPER` | Invitation hashing material |
| `EVENT_OS_RSVP_SESSION_SECRET` | Guest session HMAC |

## Optional

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port. Railway injects `PORT` |
| `EVENT_OS_ALLOW_FIXTURES` | `1` enables the synthetic identity adapter and idempotent synthetic seed |
| `EVENT_OS_SESSION_TTL_SECONDS` | Staff session TTL |
| `EVENT_OS_RSVP_KEY_ID` | Current RSVP key ring identifier |
| `EVENT_OS_PUBLIC_URL` / `EVENT_OS_BASE_URL` | Public origin for secure cookies |
| `EVENT_OS_COOKIE_SECURE` | `1` / `0` override |
| `EVENT_OS_VENDOR_PEPPER` | Vendor assignment hashing material |
| `EVENT_OS_VENDOR_SESSION_SECRET` | Vendor session HMAC |
| `EVENT_OS_VENDOR_KEY_ID` | Current vendor key ring identifier |
| `EVENT_OS_ATELIER_LINK_PEPPER` | Host Atelier magic-link hashing material |
| `EVENT_OS_ATELIER_SESSION_SECRET` | Host Atelier session HMAC |
| `EVENT_OS_ATELIER_KEY_ID` | Current host Atelier key ring identifier |
| `EVENT_OS_LAYOUT_ASSET_STORE_PROVIDER` | `railway-bucket` when the in-project layout bucket is bound |
| `EVENT_OS_LAYOUT_ASSET_BUCKET` | Private Railway S3 bucket name |
| `EVENT_OS_LAYOUT_ASSET_ENDPOINT` | S3-compatible endpoint |
| `EVENT_OS_LAYOUT_ASSET_REGION` | S3 region string |
| `EVENT_OS_LAYOUT_ASSET_URL_STYLE` | `virtual-host` or path-style |
| `EVENT_OS_LAYOUT_ASSET_ACCESS_KEY` | Secret. Railway-generated bucket access key |
| `EVENT_OS_LAYOUT_ASSET_SECRET_KEY` | Secret. Railway-generated bucket secret key |
| `EVENT_OS_LAYOUT_ASSET_SCANNER` | `in-process-content-safety` |
| `EVENT_OS_LAYOUT_EXPORT_ENABLED` | `1` enables exact-hash PDF/PNG export |

## Persistence

- `DATABASE_URL` present → Event OS uses `PostgresPlatformStore`. Health reports `persistence=POSTGRES`.
- Local/CI without `DATABASE_URL` may use the file-backed non-production store. Health reports `MEMORY_NON_PRODUCTION`.
- `NODE_ENV=production` without `DATABASE_URL` fails closed.
- `productionAuthorised=false` does not keep Event OS in memory-only mode.

## Safeguards retained

No real personal data. No live email, WhatsApp, SMS or payments. No other Railway project. No destructive reset without explicit confirmation through the synthetic cleanup command.
