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
| WebKit / Safari | — | NOT RUN automatically; CEO human live verification PASS (MD-HV1) |

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

## CEO human live verification (MD-HV1)

Recorded 2026-09-05. Evidence: `docs/control/HUMAN_LIVE_VERIFICATION.md`.

**CEO HUMAN LIVE VERIFICATION: PASS**  
**ISSUES NOTED: NONE**

The CEO personally accessed `https://control-tower-production-dbc4.up.railway.app/programme` on Railway project `atelier-doclar` and completed a visual/functional review. Completed slices displaying `IN_REVIEW` were observed and understood. `OI-FC1-001` is `RESOLVED_BY_HUMAN_VERIFICATION`.

This file remains automated live-test evidence plus that human result. It is not formal slice acceptance, independent acceptance, CEO production authorisation, specialist approval, or live-event approval.

**CONTROL TOWER PRODUCTION AUTHORISED: NO**
