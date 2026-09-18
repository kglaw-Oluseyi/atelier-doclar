# Decisions and ambiguities

## S01-DEC-001

Prisma is replaced by explicit SQL migrations. The Slice 1 logical model remains.

## S01-DEC-002

The staff application is `apps/event-os`, not `apps/web`.

## S01-DEC-003

Synthetic sign-in is available when `EVENT_OS_ALLOW_FIXTURES=1` and `productionAuthorised` is false. The Railway environment is named production, but the CEO packet forbids live providers and real data.

## S01-DEC-004

Command Atelier colour tokens are the approved values from `packages/design-system/src/atelier.ts` on the legacy branch: onyx `#11100F`, ivory `#F5F0E8`, champagne `#B89A62`, functional `#8B6E38`. No CSS rule was copied. The functional accent is darker than decorative champagne so text contrast can meet WCAG AA.

## S01-DEC-ACCESS-001 — Approved eight-role access-control policy

Sources: CEO addendum to this packet; legacy policy commit `94c45553a343f56758b3ea8be2cbd2c9f8d6f7a5`; merged commit `2033ea7c39f8ffaf1237048b0c8eb7268e9aa786`.

The eight roles are CEO, Event Director, Planner, Client Lead, Department Lead, System Administrator, Read-only Auditor and Risk Governance Reviewer. Department and workstream are real records. CEO may complete both sides of a maker/checker request. Impersonation is denied to everyone.

## Ambiguities

No unresolved mutually exclusive product decision remains. Slice 1 §2.2 excludes guest and household records, so consent and guest reference are not implemented. Slice 1 §10.11 says My Work must not pretend that alerts exist, so attention is an explicit empty explanation rather than a control.
