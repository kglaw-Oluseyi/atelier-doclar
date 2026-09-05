# Event OS Foundation Architecture

**Slice:** EOS-S01  
**Prompt Control ID:** `MD-PR-S004`

## Executable foundation

- `@maison-doclar/shared-platform` — authoritative domain, policy, audit and persistence ports
- `@maison-doclar/design-system` — restrained operational tokens
- `apps/event-os` — staff Event OS application shell

Control Tower (`apps/control-tower` and `packages/programme-*`) remains programme governance infrastructure. Event OS does not read Control Tower UI state as operational truth.

## Tenancy

Every consequential operation resolves organisation, and where applicable client and event, from stored lineage. Route parameters are inputs, not authority. Cross-organisation and cross-event reads are concealed as `NOT_FOUND`.

## Authority model

Separated records:

1. Person (identity; `externalSubject` is the immutable key)
2. Authentication / session (person ID only; no role claim)
3. Membership (organisation belonging)
4. Role (system catalogue)
5. Permission (resource.action)
6. Assignment (time-bound operational grant)
7. Approval policy scaffold (CEO-reserved actions remain distinct)

`CT4-OI-001` remains OPEN. The identity adapter is OIDC-compatible at the boundary and uses a non-production fixture adapter only when `EVENT_OS_ALLOW_FIXTURES=1`. Synthetic `not-for-production` secrets remain forbidden when `NODE_ENV=production`. No production IdP is selected.

Consequential staff mutations (sign-in, client/event create, assignment, phase transition) are server actions. Organisation scope is taken from the authenticated assignment, not from the client.

## Master Event File

Creating an event creates a versioned Master Event File with the fourteen doctrine composition slots. Slots start `NOT_COMPOSED` / `UNVERIFIED`. EOS-S01 does not implement later modules. Human authority is required for slot updates. AI cannot update MEF truth.

Operational `EventPhase` (`DISCOVER`…`LEARN`) is the Slice 1 readiness phase. It is not a collapse of the doctrine lifecycle.

## Change control and audit

Mutable records use `expectedVersion`. Stale writes return `VERSION_CONFLICT` without overwrite. Create/transition/grant accept idempotency keys. Consequential actions append immutable audit with actor, scope, action, subject, hashes, timestamp, correlation and reason.

## Out of scope

Event-Day runtime, Academy, Marketing, Ushering, biometrics/FaceGate, guest operations, Railway deployment, production IdP, and EOS-S02 onward.
