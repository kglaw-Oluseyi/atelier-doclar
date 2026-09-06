# Event OS RSVP and Guest Self-Service Boundary

**Slice:** EOS-S03  
**Prompt Control ID:** `MD-PR-S010`  
**Package:** `@maison-doclar/shared-platform`

## Ownership

`@maison-doclar/shared-platform` remains the only authoritative owner of organisation, client, event, person, membership, role, permission, assignment, guest reference, operational guest, household, consent, policy-version, audit and shared identifiers.

EOS-S03 adds RSVP/self-service capability against those records. It does not create a second Person, Guest, Event, Organisation, Membership, Role, Permission or guest directory.

| Concept | Owner | Meaning |
|---------|-------|---------|
| Operational guest | shared-platform / EOS-S02 | Event participation record. RSVP references this id. |
| RSVP policy | shared-platform | Event-scoped guest-facing names, amendment window, companion default. |
| RSVP questionnaire | shared-platform | Versioned published form. Closed versions are retained. |
| Invitation | shared-platform | Opaque guest-access capability bound to one guest and one event. |
| Guest session | shared-platform | Narrow capability session. Not a staff session, membership or Person. |
| RSVP response | shared-platform | Attendance intent, answers, provenance, version. |
| Receipt | shared-platform | Immutable submission hash. Amendments add a new receipt. |
| Entitlement | shared-platform | Explicit companion allowance or household respondent subjects. |
| Exception / assistance | shared-platform | Staff-visible review items. |

Forbidden parallel types remain forbidden, including `GuestAccount`, `RsvpUser` and `GuestStaffSession`.

## RSVP state

Attendance intent is not a boolean:

- `NOT_SUPPLIED` — unknown; distinct from no
- `ATTENDING`
- `NOT_ATTENDING`
- `UNCERTAIN`

Response status: `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `AMENDED`, `WITHDRAWN`.

Provenance: `GUEST_SELF_SERVICE`, `STAFF_ENTERED`, `STAFF_CORRECTED`.

An attending RSVP is not admission, check-in, credentialing, FaceGate eligibility or onsite presence.

## Guest access

Staff issue an opaque invitation token. The raw token is shown once as a synthetic local path. The store keeps only a peppered HMAC hash, prefix, expiry and status (`ISSUED`, `ROTATED`, `REVOKED`, `EXPIRED`).

Token exchange is performed by a server action on `/rsvp/[token]`. That action creates a guest session cookie (`md_event_os_guest_rsvp`). Scope is resolved from the stored invitation and session. Browser-supplied organisation, event or guest ids are not authority. Forged, expired, revoked or cross-bound tokens return the same unavailable state.

Guest self-service does not create a staff session, membership, assignment or Person.

## Guest-visible / editable boundary

Guest-visible: host and event display names, privacy notice, own display name, attendance intent, entitled companion fields, entitled household members by display name, dietary/accessibility answers, assistance request, confirmation.

Guest-editable: attendance intent, entitled companion and household answers, unverified dietary/accessibility, assistance note, sensitive-answer acknowledgement.

Protected: organisation/event lineage, Person identity, staff notes, audit, permissions, duplicate-resolution state, verified operational facts, invitation hashes, other guests.

## Conflict semantics

EOS-S02 field qualities remain distinct. A self-service value that differs from a staff-verified dietary or accessibility fact does not overwrite it. The existing value is kept, the submitted value is stored on an open `VERIFIED_FIELD_CONFLICT` exception, the field quality becomes `CONFLICTING`, and staff are shown a review item.

## Household / party

Household structures from EOS-S02 are used only when a staff-granted `HOUSEHOLD_RESPONDENT` entitlement lists subject guest ids in the same household. One respondent may not edit every household member by default. Companion places are a separate `COMPANION` entitlement. Partner/child/plus-one roles beyond those explicit grants are not invented.

## Staff operations

Existing RBAC is extended:

- `rsvp.policy.manage`
- `rsvp.form.manage`
- `rsvp.invitation.manage`
- `rsvp.directory.view`
- `rsvp.response.amend`
- `rsvp.exception.review`
- `rsvp.entitlement.manage`

Enforcement is server-side. The guest directory shows RSVP state and filters. The RSVP workspace shows counts, source, timestamps and attention. Staff may enter, correct or withdraw a response with a reason.

## Tenancy

Staff operations remain person → membership → role → assignment → organisation → event. Guest operations resolve scope from the invitation/session. Cross-organisation, cross-event and cross-guest access is concealed as unavailable / `NOT_FOUND`.

## Persistence and audit

`PlatformStore` remains the only mutation API. Memory and PostgreSQL stay at parity. Mutable RSVP records use `expectedVersion`. Consequential commands accept idempotency keys. Audit is append-only. Guest capability actions use `actorType: GUEST_CAPABILITY` and never write raw tokens. Guests cannot mutate audit history.

## Privacy and communications

Guest routes do not expose other guests, staff data, operational notes, permissions or audit internals. No biometric collection. Invitation generation is in scope. Production email/SMS delivery is deferred to EOS-S04. No Twilio or other production communications provider is introduced.

## Production status

`productionAuthorised = false`. Protected gates remain unsigned. Synthetic fixtures only.

## Supersession — deploy-by-default (6 September 2026)

**Former restriction:** No Railway mutation.

**Status:** SUPERSEDED for ordinary deployment and safe Postgres use in Railway project `atelier-doclar`.

**Current policy:** `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md`

**Safeguards retained:** Real guest contact, live communications, payments, destructive resets, other Railway projects, and protected-gate signatures remain gated.
