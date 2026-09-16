# ADR — EOS-S06C High Volume Guest List Intake

**Status:** Accepted for implementation under bounded EOS-S06C authority (16 September 2026)
**Pack:** `docs/control/eos-s06c/ratification-pack/` (archive SHA-256 `2b104b17dbad3a44dae8947c6250fad11629e0fe91df6c87b39ca8a0c77c74f4`)
**Baseline Git HEAD:** `275ff754cd75ef728051564b9b266e103185548f`
**Accepted application SHA (entry):** `71317881384e38671295c3fda32d533c71c3f559`

## Context

Accepted EOS-S02 guest intake is correct for small synchronous CSV imports but unsuitable for high-volume operational use: parse, duplicate analysis, guest creation and audit settlement occur inside one synchronous `mutate` / full-snapshot clone. CAP1000 sequential remote `intakeGuest` installation is prohibited as an operational path.

## Decision

1. **Sole guest authority:** `OperationalGuest` remains the only guest record consumed by RSVP, Communications, Seating and Event-Day projections. Staging candidates have no directory authority until approved promotion.
2. **Additive job model:** Introduce event-scoped intake sources, jobs, mapping editions, candidates, promotion chunks, receipts and outbox events as platform document collections. Do not create a parallel guest table.
3. **Staged workflow:** Upload → map → validate/stage → review → maker submit → checker approve → chunked promote → reconcile → receipt.
4. **Execution locality:** Promotion runs server-side near Postgres in bounded chunks (default 250 rows). Never call `intakeGuest` once-per-guest over a remote tunnel as the product path.
5. **Atomic visibility:** During `PROMOTING`, committed guests may appear in the directory only while the job status clearly shows intake in progress. `COMPLETED` / `COMPLETED_WITH_EXCEPTIONS` require reconciliation. A partial import must never be labelled complete.
6. **Maker-checker:** Submitter and approver must be different people. Decision-relevant changes after submit stale the approval.
7. **Compatibility wrapper:** Retain EOS-S02 `importGuests` / canonical-v1 CSV for small synchronous imports; high-volume path is the new job command.
8. **Read-path remediation (scoped):** Intake job progress and list reads use `viewSnapshot()` rather than full `snapshot()` clones (`TDR-S06-006` scoped remediation for S06C progress/poll paths only; debt remains OPEN until broader closure).

## Consequences

- Permissions split: create/upload/review reuse `guest.intake.create`; approve `guest.intake.approve`; cancel `guest.intake.cancel`; correction export `guest.intake.export`.
- Memory and Postgres stores share the same collections for parity.
- XLSX is supported with formula-safe cached values only; no formula execution, macros or external-link retrieval.
- Old partial CAP1000 fixture remains quarantined until a product-engine replacement is reconciled under recorded authority.
