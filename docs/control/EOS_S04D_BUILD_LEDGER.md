# EOS-S04D Build Ledger

**Slice ID:** `EOS-S04D`
**Prompt Control ID:** `MD-PR-S022`
**Starting baseline:** `2f86fee762678d01e502a23a026511cafb4e3f57`
**Status:** `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS`
**Production:** unauthorised
**Next slices:** EOS-S04E, EOS-S04F and EOS-S05 not started; not authorised by this overlay

## P00 — Controlled reconnaissance

**Mode:** Ratification overlay plus canonical mapping.  
**HEAD:** `2f86fee762678d01e502a23a026511cafb4e3f57`  
**Branch:** `main` tracking `origin/main`  

### Inventory

| Area | Reuse | Extension | New | Exclusion |
|------|-------|-----------|-----|-----------|
| Guest / party IDs | S04A `guestId` | Distinct-person union | Named companion fixture | No household/party as people |
| Invitation / RSVP | S03 authority | Observed counts as forecast input | — | Forecast never writes RSVP |
| Programme phases | S04B `phaseId` | Per-phase occupancy | — | No naive phase-sum as whole-event |
| Merchandise | S04C | — | — | Offers are not people |
| Staff identity | Existing roles | `forecast.*` / `provision.*` / `model.*` | — | No new system roles |
| Persistence | Snapshot collections + receipts | — | S04D collections + `EOS-S04D-FORECAST-PLANNING-V1` | No wholesale snapshot serialization |
| Academy | ACA-S04A/C contracts | Course-id union | ACA-S04D | Completion never grants authority |
| Control Tower | Compatibility only | — | — | Not a required deploy target |

**STOP condition:** none. Continue through P11.

## P01–P05 — Contracts, persistence, services

Shared-platform forecast schemas, `FORECAST-MODEL-V1`, operations, projections, fixtures, migration, store wiring and service methods. Backend tests: model, contracts, persistence, services, journeys.

## P06–P09 — Frontend, integration, E2E

Staff `/forecast`, host `/forecast/host`, overview and RSVP strips. Playwright `s04d-vertical.spec.ts` and `s04d-responsive-a11y.spec.ts`. Frontend architecture: `EOS_S04D_FRONTEND_ARCHITECTURE.md`.

First Playwright run: 1 passed / 3 failed (strict-mode locators). After assertion fixes: 4 passed.

## P10–P11 — Academy and hardening

`ACA-S04D` course-id union, assignment, Event OS academy surface. Thresholds unchanged: distinction ≥90, pass 80–89, retake <80. Completion never grants authority. Independent Claude-in-Chrome prompt prepared after deployment.

EOS-S04E, EOS-S04F and EOS-S05 were not started.
