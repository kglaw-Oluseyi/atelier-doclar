# EOS-S04C Build Ledger

**Slice ID:** `EOS-S04C`
**Prompt Control ID:** `MD-PR-S020`
**Starting baseline:** `3854405c3cf4aa6d387e0bd1cc066166c8feca50`
**Status:** `IN_REVIEW / NOT READY`
**Production:** unauthorised
**Next slices:** EOS-S04D–F and EOS-S05 not started

## P00 — Controlled reconnaissance

**Mode:** Read-only plus this ledger.  
**HEAD:** `9a79a443b7f08e727db12c9ea8dc4da8a557d8c0`  
**Branch:** `main` tracking `origin/main`  
**Worktree:** clean  

### Inventory

| Area | Reuse | Extension | New | Exclusion |
|------|-------|-----------|-----|-----------|
| Guest / party / relationship IDs | S04A `guestId`, `partyId`, confirmed relationships | Explicit merchandise cohorts | — | No inferred family or household substitution |
| Invitation / RSVP | S03 authority | Adjacent merchandise projections | — | Merchandise never creates invitation or attendance |
| Communications | S04 governed send | Offer/fulfilment audience filters later | — | No payment collection |
| Programme phases | S04B `phaseId` | Phase-applicable collections | — | No attendance write |
| Staff identity | Existing roles | `merch.*` permissions | — | No new system roles |
| Guest access | Separate RSVP session | Guest merchandise view | — | Household adult choices remain private |
| Vendor portal | Guest-access isolation pattern | — | Third session (`VENDOR_CAPABILITY`, `/vendor`) | No staff token reuse; no core mutation |
| Payments / measurements | — | Optional cap inches | — | All other money and body fields rejected |
| Academy | ACA-S04A contracts | Course-id union | ACA-S04C | Completion never grants authority |
| Control Tower | Compatibility only | — | — | Not a required deploy target |

### Risk map

| Risk | Control |
|------|---------|
| Money-handling drift | No amount/card/receipt fields; commercial status is vendor-attributed only |
| Household choice leakage | Per-guest offers; household projections never include another adult’s private choice |
| Measurement overcollection | Single optional `headCircumferenceInches` field; all other measurement keys rejected |
| Vendor cross-event access | Assignment event/collection/item scope checked server-side; forged IDs fail closed |
| Vendor-reported payment as MD truth | Review queue; guest-safe copy never says Maison Doclar confirmed payment |

### File candidates

`packages/shared-platform/src/merchandise-*.ts`, store/catalog/service/seed wiring, Event OS `/app/events/[eventId]/merchandise`, guest merchandise on `/rsvp`, vendor `/vendor`, ACA-S04C, Playwright `s04c-*.spec.ts`.

**STOP condition:** none. Continue to P01.

## P01–P05 — Contracts, persistence, services

Shared-platform merchandise schemas, operations, projections, vendor access, fixtures, migration `EOS-S04C-MERCHANDISE-COLLECTIONS-V1`, store wiring and service methods. Staff `merch.*` permissions; vendor `VENDOR_CAPABILITY` third session. Backend unit tests added.

## P06–P09 — Frontend, integration, E2E

Staff `/merchandise`, guest-access offer form, vendor `/vendor` portal, dossier/directory adjacent projections. Playwright `s04c-vertical.spec.ts` and `s04c-responsive-a11y.spec.ts`. Frontend architecture: `EOS_S04C_FRONTEND_ARCHITECTURE.md`.

## P10–P11 — Academy and hardening

`ACA-S04C` course-id union, assignment, Event OS academy surface. Thresholds unchanged: distinction ≥90, pass 80–89, retake <80. Completion never grants authority. Independent Claude-in-Chrome prompt prepared after deployment.

EOS-S04D–F and EOS-S05 were not started.

## Primary-journey remediation

Entered blocking TDR-S04C-001–003 from Claude’s whole-slice findings. Implemented complete staff creation, merchandise-only guest grants (`/offers`), and vendor issue/renew/revoke. Status `IN_REVIEW / NOT READY`. Not accepted. EOS-S04D–F and EOS-S05 not started.

## Final vendor-access and lifecycle-concurrency remediation

Hosted vendor mint failed because Postgres `productionStatus` was treated as production-authorised, so fixture-default vendor secrets were rejected on a synthetic Railway runtime. Guest and vendor renewal lacked durable compare-and-swap / already-applied replay. Remediation: explicit access-authority (`productionAuthorised` vs production build), Railway-only configured vendor HMAC/session secrets, persist-boundary CAS, identical-submit replay, lifecycle form locking, and a new dedicated synthetic verification assignment path that retains the Aso-Oke House revocation audit. Status remains `IN_REVIEW / NOT READY`. Not accepted. Record: `docs/control/EOS_S04C_VENDOR_LIFECYCLE_REMEDIATION.md`. Final focused verification: `docs/control/EOS_S04C_FINAL_FOCUSED_CLAUDE_VERIFICATION.md`.
