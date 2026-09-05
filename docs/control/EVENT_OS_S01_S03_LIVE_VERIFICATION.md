# Event OS S01–S03 Controlled Live Deployment and Milestone Verification

**Control ID:** `MD-PR-S012`  
**Milestone:** `EOS-LV1`  
**Product:** `EVENT_OS`  
**Mode:** Controlled non-production live verification  
**Accepted slices:** EOS-S01, EOS-S02, EOS-S03  
**Secrets:** none in this document.

This is not production authorisation, live-event release, EOS-S04 implementation, a protected-gate signature, or permission to use real guest data.

## Identifiers

| Field | Value |
|-------|-------|
| Prompt Control ID | `MD-PR-S012` |
| Baseline / deployed source SHA | `2d41a6fdb62f3192d7f27517e5eceb0b8ee96217` |
| Railway project | `atelier-doclar` |
| Railway project ID | `c1c937b7-2660-4fc2-8257-c08bd6346658` |
| Environment name | `production` (Railway name only; not Maison Doclar production) |
| Environment ID | `6d70f804-d3c7-4255-88c3-cc86531251ef` |
| Event OS service | `event-os` |
| Event OS service ID | `31c25514-ef57-43c6-97ff-49fc6dd367c5` |
| Deployment ID | `9cee3095-cb37-422a-be9e-ad632fa27a1b` |
| Deployment status | SUCCESS |
| Deployment timestamp | `2026-09-05T19:07:23.926Z` |
| Public verification URL | `https://event-os-production-bc8d.up.railway.app` |
| Staff sign-in | `https://event-os-production-bc8d.up.railway.app/sign-in` |
| Control Tower (unchanged) | `https://control-tower-production-dbc4.up.railway.app/programme` |

Deployed from the authorised repository `kglaw-Oluseyi/atelier-doclar` `main` at the verified worktree HEAD above via `railway up` to service `event-os` only. Control Tower and Postgres were not modified.

## Persistence

**Mode:** accepted Event OS non-production fixture store (`FileBackedPlatformStore` / `MEMORY_NON_PRODUCTION`) with `EVENT_OS_ALLOW_FIXTURES=1`.

PostgreSQL activation was not used. `PostgresPlatformStore` exists in `@maison-doclar/shared-platform` but accepted Event OS S01–S03 runtime is not wired to it. Wiring it would be unapproved schema/product work on accepted slices.

**Valid for this verification:** one Railway replica; CEO walkthrough can complete against the running instance.

**Limitation:** this store is not production readiness. An Event OS redeploy resets fixture/verification records. It must not be described as durable production persistence.

## Security

- Staff authentication: accepted temporary Event OS access-token + fixture staff email boundary. Permanent IdP not selected.
- RSVP guest access: accepted opaque invitation token, exchanged by server action to a guest cookie. Staff chrome is not shown on guest routes.
- Live secrets (staff access token, session secret, RSVP pepper, RSVP session secret) are Railway service variables only. They are generated, not CI fixture literals, and are not recorded here.
- Public `/sign-in` HTML was scanned: no access-token, pepper, or `not-for-production` secret leakage.
- Unauthenticated `/app` redirects to `/sign-in`.

## Synthetic verification data

Created during automated live verification. Not live Maison Doclar clients, guests, or contact data.

| Kind | Identity |
|------|----------|
| Event | Maison Doclar Verification Event (`MDVE`) |
| Guests | Amina Test (preferred name amended to Amina Verification), David Example, Tola Fixture |
| Emails | `amina.test@example.test`, `david.example@example.test`, `tola.fixture@example.test` |
| Staff emails | fixture `ceo@maison-doclar.test` and related non-production fixture subjects |

Amina Verification submitted a guest RSVP (then amended to not attending) so staff-visible provenance can be inspected. David Example and Tola Fixture remain available for a fresh CEO guest walkthrough.

No external communication was sent.

## Automated live verification

| Check | Result |
|-------|--------|
| Deployment SUCCESS | PASS |
| Health live/ready; `productionAuthorised=false` | PASS |
| HTTPS public origin | PASS |
| No obvious secret/config exposure | PASS |
| Staff unauthenticated denial / authorised access | PASS |
| EOS-S01 event/scoping/navigation | PASS |
| EOS-S02 intake, directory, detail, amendment, isolation | PASS |
| EOS-S03 staff RSVP workspace, issue, staff-visible state/provenance | PASS |
| EOS-S03 guest access, submit, confirm, amend, invalid capability, no staff chrome | PASS |
| Desktop / mobile | PASS |
| No serious/critical axe findings on key staff and guest routes | PASS |
| Cross-assignment leakage denied | PASS |
| Control Tower live health | PASS |
| Control Tower accepted count remains 3 | PASS |
| Protected gates remain unsigned | PASS |
| Control Tower `productionAuthorised=false` | PASS |

## Human verification chronology

This section is chronological. Automated live verification completed first. CEO human verification was PENDING at deployment time and is recorded as complete only after the CEO walkthrough.

### 1. Automated live verification

**AUTOMATED LIVE VERIFICATION: PASS**

Recorded under `MD-PR-S012` / `EOS-LV1` at deployment of `9cee3095-cb37-422a-be9e-ad632fa27a1b`. See the automated checks above. This result is unchanged.

### 2. CEO human verification at deployment time

**CEO HUMAN LIVE VERIFICATION: PENDING**

At live-deployment closeout, CEO human verification was not yet complete. That PENDING state must remain visible as history. It was not PASS at deployment time.

### 3. CEO walkthrough completed

The CEO / George Lawson completed the human walkthrough against the same live Event OS verification deployment, using only the synthetic Maison Doclar Verification Event and synthetic guests Amina Verification, David Example and Tola Fixture. No live guest or client data was used.

Technical review authority: ChatGPT / AI CTO.

Control artefact: `docs/control/EVENT_OS_S01_S03_HUMAN_VERIFICATION.md`  
Evidence ID: `EV-EOS-S01-S03-HUMAN-VERIFICATION`  
Control ID: `MD-PR-S013`  
Milestone: `EOS-HV1`

### 4. CEO / AI CTO ruling

**CEO HUMAN LIVE VERIFICATION: PASS WITH MINOR REFINEMENTS**

| Journey | Result |
|---------|--------|
| Staff experience | PASS |
| Guest access | PASS |
| Guest RSVP | PASS |
| RSVP amendment | PASS |
| Guest → staff handoff | PASS |
| RSVP / admission separation | PASS |
| Mobile human verification | NOT ASSESSED |

Mobile was not assessed because the human-verification browser environment could not reliably resize to a phone viewport. This is not PASS and not FAIL. Automated responsive/accessibility verification remains valid and is distinct.

**BLOCKING DEFECTS: ZERO**  
**KNOWN TECHNICAL DEBT ARISING FROM WALKTHROUGH: ZERO**  
**PRODUCT / UX FINDINGS TO CARRY FORWARD: YES** (`HV-EOS-001` … `HV-EOS-005`)  
**PRODUCTION AUTHORISED: NO**  
**EOS-S04 IMPLEMENTATION AUTHORISED: NO**

The five findings are recorded in `docs/control/EVENT_OS_S01_S03_HUMAN_VERIFICATION.md`. They are not technical debt, not acceptance failures, not an EOS-S03 reopening, and not automatic EOS-S04 scope.

## Programme state after deployment

| Measure | Value |
|---------|-------|
| EOS-S01 | ACCEPTED |
| EOS-S02 | ACCEPTED |
| EOS-S03 | ACCEPTED |
| Accepted count | 3 |
| EOS-S04 | READY / technically eligible |
| EOS-S04 implementation authorised | NO |
| Foundation | IN_REVIEW |
| Protected gates | UNSIGNED |
| productionAuthorised | false |

No new accepted product slice was created for this milestone.

## Issues / remediation

None. No configuration or product remediation commits were required after deploy.

**KNOWN EVENT OS S01–S03 TECHNICAL DEBT: ZERO**

## CEO walkthrough (about 10–15 minutes)

Do not paste Railway secrets into git, chat transcripts, or this file.

1. Open `https://event-os-production-bc8d.up.railway.app/sign-in`.
2. Staff email: `ceo@maison-doclar.test`.
3. Access token: copy `EVENT_OS_ACCESS_TOKEN` from Railway project `atelier-doclar`, service `event-os`, Variables. Rotate it in Railway after verification if desired.
4. Open **Events** → **Maison Doclar Verification Event**.
5. Open **Guest directory**. Inspect Amina Verification (already has a guest RSVP), David Example, and Tola Fixture.
6. Open Amina Verification. Observe RSVP intent, provenance (`GUEST SELF SERVICE`), and time.
7. Open David Example or Tola Fixture → **Issue guest access** → **Open guest access**. Use that one-time guest view (do not file the raw token).
8. Judge first impression and tone. Submit a response. Confirm. Amend if you wish.
9. Return to staff sign-in and the same guest record. Confirm the new RSVP state, provenance, and time.

Judge:

- Does this feel like Maison Doclar?
- Is the guest journey calm and premium?
- Is wording appropriate?
- Is anything confusing?
- Is staff information hierarchy intuitive?
- Are there unnecessary steps?
- Is the guest-to-staff operational handoff clear?
- Does mobile usage feel natural?

## What this is not

- Maison Doclar production
- Live-event release
- EOS-S04 implementation
- Signing of any protected gate
- Real-client or real-guest deployment
