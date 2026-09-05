# Live Deployment Report

**Slice-ID:** MD-LV1  
**Prompt-Control-ID:** MD-PR-S002  
**Product:** FOUNDATION  
**Baseline:** `e337eba83cfc41590f226f980772f848d827b6e3`  
**Railway project:** `atelier-doclar` (`c1c937b7-2660-4fc2-8257-c08bd6346658`)  
**Secrets:** none in this document.

## A. Git

| Item | Value |
|------|-------|
| Repository | `kglaw-Oluseyi/atelier-doclar` |
| Branch | `main` |
| Required baseline | `e337eba83cfc41590f226f980772f848d827b6e3` |
| Deployment slice | MD-LV1 (this commit) |

## B. Railway

| Item | Value |
|------|-------|
| Project name | `atelier-doclar` |
| Project ID | `c1c937b7-2660-4fc2-8257-c08bd6346658` |
| Environment | `production` |
| Application service | `control-tower` (`17dfb657-71ee-451b-acff-c3f0a18067b2`) |
| Persistence service | `Postgres` (`5d86579b-6b66-4178-96b8-b66e1f7755a3`) |
| Verified deployment | `e2fa65d2-d6a9-4ea9-ae62-ce57b290b686` |
| Deployment status | SUCCESS |

No other Railway project was used.

## C. Live URL

`https://control-tower-production-dbc4.up.railway.app/programme`

Origin: `https://control-tower-production-dbc4.up.railway.app`

## D. Persistence

PostgreSQL behind `ProgrammeStore` / `PostgresProgrammeStore`. Schema migrated on first open. Corpus seed is appended only when event IDs are absent. Snapshots and audit share the same database. Railway Postgres volume is attached. Backup/restore remains `pg_dump` / Railway point-in-time recovery. No synthetic production events were inserted as accepted truth.

## E. Authentication

**TEMPORARY live-verification access.** Permanent production IdP remains unresolved (`CT4-OI-001` OPEN).

- Named human actor (UNKNOWN / Cursor rejected)
- Role: executive / reviewer / implementer / reader
- httpOnly `md_programme_session` cookie, `Secure` in production, `SameSite=Lax`, 2-hour TTL
- Environment-only access token
- Logout at `/api/session/logout`
- Cannot sign protected gates

## F. GitHub live

- Client: `GitHubHttpProvider` with `PROGRAMME_GITHUB_LIVE=1`
- Repository hard-bound to `kglaw-Oluseyi/atelier-doclar`
- Controlled reconciliation ran after start; readiness reported `githubIngestion=AVAILABLE`
- Remote webhook created: hook `674900340` → `POST /api/programme/github/webhook`
- Invalid signatures are rejected (`INVALID_SIGNATURE`)

## G. Health

Observed on the live origin:

- `GET /api/health/live` → 200, `alive=true`, `productionAuthorised=false`
- `GET /api/health/ready` → 200, `ready=true`, `programmeData=AVAILABLE`, `persistence=AVAILABLE`, `githubIngestion=AVAILABLE`, `webhook=CONFIGURED`, `rag=AVAILABLE`, protected gates unsigned, `productionAuthorised=false`

## H–I. Automated verification

Chromium desktop and Chromium mobile 390×844: 14/14 live smoke tests passed. WebKit was not run automatically and remains a human gate. Local Playwright (19) and unit/validate/project suites passed before deploy.

## J. Human verification

Recorded in MD-HV1. See `docs/control/HUMAN_LIVE_VERIFICATION.md`.

**CEO HUMAN LIVE VERIFICATION: PASS**  
**ISSUES NOTED: NONE**

`OI-FC1-001` is `RESOLVED_BY_HUMAN_VERIFICATION`. This is not production authorisation.

## K. Security

HTTPS Railway domain. Fixtures disabled. Synthetic secrets forbidden. Unauthenticated `/programme` redirects to login. Webhook signature required. Protected gates remain unsigned. Production is **not** authorised.

## L. Open items

Resolved by this slice where actually deployed: `CT2-OI-001`, `CT4-OI-002`. Hosting part of `OI-CT0-004` recorded; item remains OPEN because the IdP is unresolved.

## M. Gate

**CONTROL TOWER DEPLOYED LIVE: YES**  
**AUTOMATED LIVE VERIFICATION: PASS**  
**CEO HUMAN LIVE VERIFICATION: PASS**  
**HUMAN LIVE VERIFICATION ISSUES: NONE**  
**KNOWN FOUNDATION TECHNICAL DEBT: ZERO**  
**CONTROL TOWER PRODUCTION AUTHORISED: NO**  
**EOS-S01 TECHNICALLY ELIGIBLE: YES** — not executed.
