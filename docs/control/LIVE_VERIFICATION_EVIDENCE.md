# Live Verification Evidence

**Slice-ID:** MD-LV1  
**Prompt-Control-ID:** MD-PR-S002  
**Live origin:** `https://control-tower-production-dbc4.up.railway.app`  
**User-facing URL:** `https://control-tower-production-dbc4.up.railway.app/programme`  
**Secrets:** none in this document.

## Automated live smoke

| Browser | Viewport | Result |
|---------|----------|--------|
| Chromium | desktop | PASS (7/7) |
| Chromium | 390×844 | PASS (7/7) |
| WebKit / Safari | — | NOT RUN — human verification required |

Totals: **14 passed**, 0 failed. axe: no serious/critical violations on the live portfolio.

Covered automatically:

- unauthenticated `/programme` redirect
- named-actor login
- logout
- portfolio, roadmap, product routes, slice `MD-FC1`, open items, commits, evidence, decisions, releases, ask, charts, ops
- unsigned protected gates
- RAG citation/abstention
- liveness and readiness
- mobile layout

Not run automatically: Safari / VoiceOver / human screen-reader pass.

## Live health snapshot

Recorded after deployment `e2fa65d2-d6a9-4ea9-ae62-ce57b290b686`:

- Liveness 200, process alive, production authorised false
- Readiness 200, programme data available, PostgreSQL available, GitHub ingestion available, webhook configured, RAG available
- Unsigned: `GATE-SPECIALIST-BIOMETRIC`, `GATE-VENUE-REHEARSAL`, `GATE-CEO-PRODUCTION`, `GATE-INDEPENDENT`

## Security probes

- Invalid webhook signature → 400 `INVALID_SIGNATURE`
- Unauthenticated `POST /api/programme/ask` → 401
- Unauthenticated `/programme` → 307 `/programme/login`
- Fixtures not enabled on the live service

## CEO / human remaining steps

`OI-FC1-001` can be completed only by a named human reviewer. Do not treat this file as human acceptance.

1. Open `https://control-tower-production-dbc4.up.railway.app/programme`.
2. Confirm HTTPS and the temporary-verification login copy.
3. In Railway project `atelier-doclar` → service `control-tower` → Variables, copy `PROGRAMME_ACCESS_TOKEN`. Do not commit it.
4. Sign in with your real name, an appropriate role, and that token.
5. Confirm logout returns to login and a new visit to `/programme` requires sign-in again.
6. Inspect the routes listed in `docs/control/CONTROL_TOWER_LIVE_VERIFICATION.md`.
7. Confirm MD-B0–MD-CT9, MD-FC1 and MD-LV1 are IN_REVIEW, accepted = 0, EOS-S01 is not started, and production authorised is false.
8. Check desktop, mobile, and Safari. Use keyboard only for one pass.
9. Record human acceptance separately. Do not mark production approved from the Control Tower.
