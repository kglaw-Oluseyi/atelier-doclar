# CT4 Implementation — Control Tower shell and executive portfolio

**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0005`  
**Native ID:** `CT4`  
**Slice ID:** `MD-CT4`  
**Status:** `IN_REVIEW`  
**Baseline:** `3164b7d73ebff68c41a7f33944a993ddb4f43906`

Private `/programme` shell and executive portfolio. No production IdP, no Railway, no protected-gate approval UI.

## Architecture

| Item | Path |
|------|------|
| View/session package | `packages/programme-tower/` |
| Next.js App Router app | `apps/control-tower/` |
| Route | `/programme` |
| Login | `/programme/login` |
| Session API | `/api/session` |
| View API | `/api/programme/view` |

Framework: Next.js App Router (CT0-P-NEXT proposal). Status still comes from CT2. Ingestion remains CT3.

## Auth

HMAC-signed httpOnly session cookie. Named actor + role + shared access token. `UNKNOWN`/`Cursor` rejected. Production IdP unselected (`CT4-OI-001`). This UI cannot approve CEO/independent/specialist/venue gates.

## Portfolio

Product cards, accepted/remaining counts, blockers, Foundation critical path, now/next/later, commit activity, check/evidence gaps, unsigned gates, freshness. Percentage remains UNAVAILABLE without weights. Live GitHub UNKNOWN is not rendered healthy.

## UI states

loading, empty, denied, stale, degraded, conflict, error, recovery. Fixtures only when `PROGRAMME_ALLOW_FIXTURES=1`.

Later CT5–CT8 surfaces are listed in the nav as reserved, not implemented.

## Commands

```text
pnpm typecheck
pnpm test
pnpm e2e
pnpm programme:validate
pnpm programme:project
```
