# Event OS Shared Platform Boundary

**Slice:** EOS-S01  
**Prompt Control ID:** `MD-PR-S004`  
**Package:** `@maison-doclar/shared-platform`

This is the single authoritative shared-platform boundary for Maison Doclar product identity, organisation, event, membership, role, authority, guest reference, consent, policy-version references, consequential audit identity and shared identifiers.

## Ownership

Every shared concept is owned by `@maison-doclar/shared-platform`. Product applications may project these records. They may not invent a second authoritative store.

| Concept | Owner | Event OS | Later Event-Day / Academy / Marketing / Ushering |
|---------|-------|----------|--------------------------------------------------|
| Organisation | shared-platform | consume | consume |
| Client | shared-platform | consume | consume |
| Event | shared-platform | consume | consume the same event ID |
| Person / human identity | shared-platform | consume | consume the same person ID |
| Membership | shared-platform | consume | consume |
| Role / permission | shared-platform | consume | governed translation only if a later slice authorises it |
| Assignment / operational authority | shared-platform | consume | consume |
| Approval authority | shared-platform (scaffold) | consume | do not treat role as approval |
| Guest reference | shared-platform | contract only in EOS-S01 | Event-Day references this ID |
| Consent | shared-platform | contract only in EOS-S01 | all products read the same consent record |
| Policy version reference | shared-platform | consume | consume |
| Consequential audit | shared-platform | consume | extend, do not replace |
| Master Event File identity | shared-platform | Event OS composes slots | Event-Day references the same event / MEF IDs |

Forbidden parallel types include `EventOSUser`, `EventDayUser`, and independent organisation or event ID schemes.

## Persistence boundary

`PlatformStore` is the only mutation API. Local/test use `MemoryPlatformStore` (`NON_PRODUCTION`). PostgreSQL is the ratified production direction and is implemented as `PostgresPlatformStore` behind the same port. EOS-S01 does not authorise production migration or Railway database mutation.

Control Tower continues to use `ProgrammeStore` for programme governance events. That store is not Event OS operational truth.

## Extension path

Later products add adapters or projections that import `@maison-doclar/shared-platform`. They must not copy Organisation, Person, Event, Consent or Audit schemas into product-owned packages.

## EOS-S02 extension

EOS-S02 added operational guest, household, duplicate-candidate and intake-batch collections to the same store. Those records consume organisation, event, person and guest-reference identifiers. They do not replace Person or GuestReference. See `docs/control/EVENT_OS_GUEST_DIRECTORY.md`.
