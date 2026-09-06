# EOS-S04A Milestone 1 Independent Review

**Review authority:** ChatGPT / Programme and Technical Review Authority  
**CEO:** George Lawson  
**Reviewed:** 6 September 2026  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Reviewed HEAD:** `b03b671a95a8690e057ae433fb1548bd30631f5e`  
**Scope:** EOS-S04A P00-P02, consolidated remediation, and local/GitHub parity controls  
**Decision:** PASS WITH OBSERVATIONS

## Evidence reviewed

The independent review inspected the pushed GitHub implementations for:

- addressing and identity contracts;
- party, relationship, companion, responsible-adult and event-series schemas;
- additive snapshot compatibility;
- S04A persistence validation, including embedded OperationalGuest extensions;
- deterministic legacy-household migration;
- receipt-scoped non-destructive rollback;
- S03-backed synthetic entitlement authority;
- role and permission grants;
- positive and negative contract, fixture, migration and persistence tests;
- the cumulative technical-debt and regression register;
- the local/GitHub parity policy.

Local verification recorded at the reviewed implementation state: TypeScript PASS; 406 tests passed with 0 failures and 0 skips; programme validation PASS with 84 slices and 0 cycles; diff check PASS.

GitHub `main` contains the full controlled commit chain. Railway project `atelier-doclar`, production environment, was inspected read-only. The durability push did not create a new Event OS or Control Tower deployment.

## Findings closed before this decision

- unsafe collection-clearing rollback;
- missing persist/hydrate validation for new S04A collections;
- missing validation for OperationalGuest addressing, ageBand and childReadiness;
- orphaned synthetic S03 authority reference;
- unauthorised Client Lead and Department Lead S04A grants;
- silent empty-party migration;
- unsafe migration collision/reuse handling;
- incorrect diff-check and ledger evidence.

## Observations carried forward

These are not Milestone 1 blockers:

1. Cross-record and cross-event service invariants remain to be enforced in P03/P04.
2. Planner entitlement management must remain bounded by EOS-S03 quantity authority.
3. Concurrent companion materialisation must be exactly-once and transactional.
4. Server projections must restrict child, protocol, protection and household information to minimum necessary.
5. Postgres whole-snapshot replacement is not itself proof of atomic business mutations; P03 must provide transaction-safe coupled writes and failure rollback.
6. A successful migration rollback retains its journal record as `ROLLED_BACK`; audit timestamps and provenance must remain accurate.
7. S03 free-text `companionNames` reconciliation remains due in P03/P05.

All observations must remain in the cumulative technical-debt/regression process until covered or formally resolved.

## Gate ruling

Milestone 1 — Contract and Migration Freeze: **PASSED**.

EOS-S04A P03-P07 may proceed under the existing EOS-S04A authority and the separate continuation instruction issued with this review. Cursor must stop again at Milestone 2 after demonstrating the first complete frontend/backend vertical journey.

This decision does not accept EOS-S04A, authorise deployment, authorise production, sign a protected gate, or authorise EOS-S04B onward or EOS-S05.
