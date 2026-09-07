# EOS-S04B Ratification and Implementation Authority

**Slice ID:** `EOS-S04B`  
**Product:** `EVENT_OS`  
**Prompt Control ID:** `MD-PR-S018`  
**Title:** Multi-Phase Events, Arrival Routing & Perimeter Access  
**Date:** `2026-09-07`  
**Authority:** George Lawson, CEO of Maison Doclar  
**Starting baseline:** `40d65fa97fc9f2f0424757b7abd27872c0644f21`  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Railway project:** `atelier-doclar` only  

## Decision

George Lawson ratifies `docs/control/Maison_Doclar_EOS-S04B_Cursor_Prompt_Pack_v1.0.docx` as the controlling EOS-S04B implementation pack, subject to the CEO authority overlay issued 2026-09-07.

EOS-S04B is the canonical successor to accepted EOS-S04A.

| Field | Former | Current |
|-------|--------|---------|
| Status | `DRAFT / IMPLEMENTATION NOT AUTHORISED` | `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS` |
| Prompt Control ID | none | `MD-PR-S018` |
| Catalogue slice | no | no — accepted-slice count remains 4 |
| Production | unauthorised | remains unauthorised |
| Protected gates | unsigned | remain unsigned |

EOS-S05 and EOS-S04C–F are **not** authorised by this decision.

## Controlling sources

| Document | Programme status after this decision |
|----------|--------------------------------------|
| CEO authority overlay (this instruction) | CONTROLLING for implementation, push and Railway deployment of affected `atelier-doclar` services |
| `docs/control/Maison_Doclar_EOS-S04B_Cursor_Prompt_Pack_v1.0.docx` | CONTROLLING implementation pack, subject to the overlay |
| `docs/control/Maison_Doclar_EOS-S04B_Controlled_Slice_Pack_v1.0_DRAFT.docx` | RATIFIED requirements source; filename retained as historical evidence |
| `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md` | CONTROLLING for ordinary push and Railway project `atelier-doclar` |
| `docs/control/EOS_S04A_ACCEPTANCE.md` | Unchanged. S04A remains ACCEPTED. This decision does not reopen S04A. |

## Historical wording preserved as evidence

The following sentences remain in source packs and prior control files. They are **not** rewritten. They are superseded for current execution:

1. Controlled slice pack banner: `DRAFT FOR CEO RATIFICATION — implementation not authorised`.
2. Slice pack §18: approval of the draft does not itself authorise implementation.
3. Cursor prompt pack: `Push held for independent end-of-slice review`; `Railway … no action or deployment`.
4. Cursor prompt pack permanent control: Railway may be referenced for compatibility only.
5. `CURRENT_STATE.md` (before this record): `EOS-S04B IMPLEMENTATION AUTHORISED: NO`.
6. `DOCUMENT_AUTHORITY_REGISTER.md` addendum 2026-09-07: S04B packs listed as draft / not implementation authority.
7. `EXECUTION_COMPATIBILITY_REGISTER.md` addendum 2026-09-07: successor hold after S04A acceptance.

**Superseding decision (2026-09-07):** this CEO instruction is the separate implementation-authority decision required by those records. Deploy-by-default remains controlling for verified work on `atelier-doclar`. Deployment is not slice acceptance and is not protected production authorisation.

## Reconciliation (not STOP)

No genuine contradiction was found that affects security, privacy, identity, access authority, event scoping or data integrity.

Wording differences already resolved by this authority:

| Topic | Resolution |
|-------|------------|
| Push / Railway | Overlay and deploy-by-default supersede pack “held / no Railway” wording. |
| Draft vs ratified | Overlay ratifies the Cursor pack and authorises implementation. |
| Existing `EventProgramme` / `EventRecord.phase` | S04B programme phases are `ProgrammePhase` records scoped to immutable `eventId`. Slice-1 operational `EVENT_PHASES` and the existing client `EventProgramme` scaffold are not rewritten. |
| Pack roles Protocol / Security / Transport / Gate | First vertical uses the current canonical system roles. Gate Supervisor/Operator runtime admission is Slice 8 and is not implemented here. Missing system roles fail closed; they are not invented as attendance writers. |
| Slice 8 absence | S04B publishes signed offline projections and does not write live attendance. |

## Safeguards retained

- `productionAuthorised` remains `false`.
- No real clients, guests or personal data.
- No public access, external communications, payments, providers or biometrics.
- No force-push, rebase, amend or history rewrite.
- No other repository or Railway project.
- Accepted EOS-S01–S04A contracts are not weakened.
- EOS-S04C–F and EOS-S05 are not started.
