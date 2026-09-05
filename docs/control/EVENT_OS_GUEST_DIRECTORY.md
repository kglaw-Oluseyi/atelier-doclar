# Event OS Guest Directory Boundary

**Slice:** EOS-S02  
**Prompt Control ID:** `MD-PR-S008`  
**Package:** `@maison-doclar/shared-platform`

## Ownership

`@maison-doclar/shared-platform` remains the only authoritative owner of organisation, client, event, person, membership, role, permission, assignment, guest reference, consent, policy-version, audit and shared identifiers.

EOS-S02 extends that boundary with event-scoped operational records:

| Concept | Owner | Meaning |
|---------|-------|---------|
| Person | shared-platform | Authoritative human identity. Not created by guest intake. |
| Guest reference | shared-platform | Identity-safe `REFERENCE_ONLY` pointer from a person to an event. |
| Operational guest | shared-platform | Event participation / directory record. May exist without a person. |
| Guest household | shared-platform | Event-scoped grouping key. Not seating, travel or protocol. |
| Duplicate candidate | shared-platform | Proposed relationship for human resolution. Never an automatic merge. |

Forbidden parallel types remain forbidden, including `EventOSGuest`, `GuestUser`, `GuestPerson`, `EventGuestIdentity`, `GuestEvent` and `GuestOrganisation`.

## Person / guest distinction

A guest is not automatically a user, membership, staff assignment, approval authority, check-in, admission decision or biometric identity.

Intake creates an operational guest. It does not create a Person. A governed link may attach an existing Person and a GuestReference. The link is reversible. The GuestReference is retained for audit.

## Tenancy

Every guest read and write resolves organisation and event from stored lineage and the authenticated assignment. Route, form and browser organisation IDs are inputs, not authority. Cross-organisation and cross-event access is concealed as `NOT_FOUND`.

## Intake

Manual staff intake and canonical CSV import (`canonical-v1`) create operational records with provenance (source, named actor, timestamp, correlation, reason), idempotency and validation. Unknown CSV columns are rejected. Insufficient identity rows are not promoted.

## Data quality

Field qualities are distinct: `MISSING`, `NOT_SUPPLIED`, `NOT_APPLICABLE`, `UNVERIFIED`, `PENDING_VERIFICATION`, `CONFLICTING`, `VERIFIED`. Absent information is not rendered as healthy completeness. Verified fields cannot be overwritten without an explicit replace and reason.

## Duplicate / identity safety

Exact within-event email or phone matches create `DUPLICATE_RISK` candidates. Same-name matches create `FUZZY_NAME` suggestions only. Matching never merges records and never creates a Person. Authorised humans may keep records separate, dismiss a suggestion, or link an existing Person.

## Privacy

Guest fields are purpose-bound operational data. Audit stores hashes, not raw personal values in metadata. No biometric collection. Consent and policy-version records remain the EOS-S01 contracts; EOS-S02 does not invent a legal doctrine. Unresolved privacy decisions stay open.

## Permissions

Existing EOS-S01 RBAC is extended, not replaced:

- `guest.directory.view`
- `guest.intake.create`
- `guest.record.amend`
- `guest.duplicate.resolve`
- `guest.person.link`

Enforcement is server-side.

## Persistence and audit

`PlatformStore` remains the only mutation API. Memory and PostgreSQL adapters stay at parity. Mutable guest records use `expectedVersion`. Creates and consequential mutations accept idempotency keys. Audit is append-only and is not editable through guest-directory CRUD. Production migration and Railway mutation remain unauthorised.

## Deferred

RSVP, guest self-service, communications, seating, travel, accommodation, protocol, gifting, check-in, admission, FaceGate, Event-Day runtime, production object-storage / malware scanning, staging deployment, and production IdP are out of scope.
