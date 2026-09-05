# EOS-S01 Implementation Report

**Slice ID:** `EOS-S01`  
**Product:** `EVENT_OS`  
**Prompt Control ID:** `MD-PR-S004`  
**Native ID:** `S01`  
**Baseline:** `de29a916bab35ba476745a9fe8f52c0b61aa86d9`  
**Status:** `IN_REVIEW` — implemented; not `ACCEPTED`  
**Railway:** not authorised  
**Production:** not authorised

## What became executable

- Shared platform domain and policy engine
- Organisation, client, event, person, membership, role, assignment, MEF, consent and guest-reference contracts
- Memory and PostgreSQL persistence adapters
- Event OS staff application shell with sign-in, clients, events, My Work, access, audit and health
- Server-first sign-in and mutations; organisation scope resolved from the session
- Isolation, concurrency, idempotency, audit, schema and accessibility tests (dev and production-like Playwright)

## Recorded contradictions (not silently reconciled)

| Historical Slice 1 assumption | Controlling later rule | Decision |
|------------------------------|------------------------|----------|
| Neon + Prisma | Existing PostgreSQL ADR; no second DB architecture | Ports/adapters; no Prisma/Neon |
| Production-like OIDC | `CT4-OI-001` OPEN; do not invent IdP | OIDC-compatible boundary + non-production adapter |
| Railway staging deploy | EOS-S01 wrapper forbids Railway | Health only; no deploy |
| `apps/web` | Control Tower already occupies `apps/` | `apps/event-os` |
| Seven-phase EventPhase as the lifecycle | Doctrine lifecycle must not be collapsed | EventPhase is operational; MEF slots are doctrine |

## OI-FC1-004

Resolved as `RESOLVED_BY_EVENT_OS_ARCHITECTURE`. Evidence: `@maison-doclar/shared-platform` ownership map, Event OS consumption, isolation/identity tests, explicit persistence port, extension document.

## Not done, correctly

EOS-S02 guest directory, Event-Day runtime, Academy, Marketing, Ushering, production migration, production IdP, slice acceptance.
