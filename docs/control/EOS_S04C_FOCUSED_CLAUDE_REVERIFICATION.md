# EOS-S04C focused Claude-in-Chrome re-verification

**Authority:** `MD-PR-S020`. Claude verifies. Claude does not accept EOS-S04C.  
**Mode:** Focused re-verification of remediated primary journeys only.  
**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
**Visual language:** Command Atelier. Functional light-surface accent `#8B6E38`.

Do not start EOS-S04D, EOS-S04E, EOS-S04F or EOS-S05. Do not collect payments. Do not send email, WhatsApp or SMS.

Do not repeat already-passed collection persistence, basic identity/cohort copy, or 360px guest-directory evidence except where needed to complete a repaired journey.

## Deployment gate

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `live`, `productionAuthorised`.
3. `deployedSha` must equal `origin/main` of `kglaw-Oluseyi/atelier-doclar`.
4. Persistence must be `POSTGRES`. Migrations must be applied. `productionAuthorised` must be false.
5. If any gate fails, verdict is `BLOCKED`.

Starting baseline: `267e3316347fb76e37cf21d80ba3a352e637d630`.  
Ending SHA: live `deployedSha` after this remediation deploy.

## Identities (synthetic)

Staff token: Railway `EVENT_OS_ACCESS_TOKEN`. Do not paste the secret into evidence.

| Role | Email |
|------|-------|
| CEO | `ceo@maison-doclar.test` |
| Event Director | `director@maison-doclar.test` |
| Planner | `planner@maison-doclar.test` |
| Auditor | `auditor@maison-doclar.test` |

Merchandise workspace: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/merchandise`

Use separate browser contexts for staff, guest (`/offers`) and vendor (`/vendor`). Hidden controls are not server enforcement.

## Required journeys

1. **Staff creation.** CEO or Event Director: create a new collection (empty-state next action must appear) → add an item → set phase applicability without creating attendance → choose named guest or explicit cohort → preview the resolved target set (identities not merged) → create and issue the offer → inspect status → withdraw or recover from a validation/concurrency failure. Household/party IDs must not substitute for guests. A newly created collection must not be a dead end.
2. **Direct guest access.** From the merchandise workspace, Issue guest access for a guest who already has an offer. Do not use Communications and do not use dossier RSVP “Issue guest access” as the merchandise path. Open private guest view / Copy test link in a separate context. Record a private choice. Confirm RSVP/attendance unchanged. Repeat the identical issue: one active grant. Renew supersedes prior access. Revoke fails closed. Cross-guest and forged tokens fail closed without protected-data flash.
3. **Cap circumference.** Optional male cap circumference in inches. Consent is not preselected. No value without consent. Decline stores nothing. Withdraw removes availability. Reject 0, negative, non-numeric, implausible, centimetre text, and other body fields. No inference.
4. **Vendor assignment.** CEO/Event Director: create or select a synthetic vendor, assign event/collection/item scope, set expiry, issue, open/copy the synthetic link. Inspect accurate states (not issued / active / expiring / expired / revoked / renewed / unavailable). Do not label ready unless the presented link is currently usable. Confirm an already-open vendor session loses authority after revocation.
5. **Vendor least privilege.** Vendor sees assigned fulfilments only. No full guest directory, unrestricted dossier, RSVP, invitation, party, credential or attendance mutation. Cap inches only if required for assigned fulfilment. Cross-event/cross-vendor fails closed.
6. **Role matrix.** Planner: routine merchandise coordination only; cannot sponsor, grant vendor access, review protected exceptions, or manage restricted measurements. Auditor: read-only; no S04C mutation. Unauthenticated/expired/revoked fail closed.
7. **Session separation.** Staff cookie, merchandise guest cookie `md_event_os_offers`, vendor cookie `md_event_os_vendor`. Staff tokens do not open vendor or private guest views.
8. **Concurrency.** Rapid identical collection/item/offer/guest-access/vendor-access submissions produce one durable result. Different stale values conflict. Revoked vendor authority cannot win a race. Safe reload recovers durable truth.
9. **Independence.** Merchandise must not create payment, receipt, balance, deposit, settlement, refund, card/bank details, invitation, RSVP entitlement, companion, attendance, credential or perimeter permission.
10. **Persistence and Academy.** Staff/guest/vendor survive navigation, reload and sign-out/sign-in where those sessions exist. ACA-S04C distinction ≥90, pass 80–89, retake <80. Completion grants no operational authority.

Synthetic banners must be visible while `productionAuthorised=false`. No email/WhatsApp/SMS.

## UX and accessibility (repaired surfaces only)

360px, 768px, desktop, 200%-equivalent: no document-level horizontal overflow on merchandise, `/offers` and `/vendor`. Pointer on enabled controls; `not-allowed` on disabled. Visible focus. Accessible status regions. Reduced motion. Functional champagne `#8B6E38` on light surfaces. Run axe on representative staff merchandise, private guest and vendor pages. Serious/critical axe issues are MAJOR or BLOCKER.

## Verdict language

Claude verifies. Claude does not accept EOS-S04C.  
EOS-S04D–F and EOS-S05 remain untouched.
