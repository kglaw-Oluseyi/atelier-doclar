# EVENT_OS_ENTRY_GATE

**Slice:** MD-FC1  
**Product:** EVENT_OS  
**Authority:** Foundation closeout reconciliation. This document does not authorise EOS-S01 execution.

## Required before EOS-S01 coding may be declared technically eligible

- Known Foundation technical-debt categories are zero (code, architecture, tests, security, accessibility, data integrity, operations).
- Programme DAG validates.
- Control Tower, security-negative and accessibility automated suites are green.
- Production-only decisions are separated and do not masquerade as Foundation defects.
- Protected approvals remain explicit and unsigned.
- Genuine Event OS dependencies are identified.

## Not required before EOS-S01 coding

- Railway deployment of the Control Tower.
- Production PostgreSQL provisioning.
- Production IdP selection.
- Human live-browser acceptance of a hosted URL.
- Independent acceptance (`OI-FC1-002`).
- CEO production authorisation (`OI-FC1-003`).
- LLM / RAG vendor selection (`CT7-OI-001`).
- External messaging (`CT8-OI-001`).
- Invented programme weights (`CT2-OI-002` remains UNAVAILABLE by design).

## Valid Event OS / Event-Day dependencies that remain open

| ID | Why it remains |
|----|----------------|
| OI-CT0-002 | EOS-S08 must not be built as a parallel Event-Day runtime |
| OI-CT0-003 | Bounded Academy readiness before EDR-R17 |
| OI-FC1-004 | Shared identity/organisation/event/consent store must not be forked |

These do **not** keep EOS-S01 in `BLOCKED` after the stale “no application foundation” item (`OI-CT0-005`) was resolved by implementation.

## Must not happen in this gate

- Begin Event OS product code.
- Manufacture `ACCEPTED` for MD-B0–MD-CT9 or MD-FC1.
- Treat technical review as production authorisation.
