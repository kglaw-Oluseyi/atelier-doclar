# EOS-S04C Ratification and Implementation Authority

**Slice ID:** `EOS-S04C`  
**Product:** `EVENT_OS`  
**Prompt Control ID:** `MD-PR-S020`  
**Title:** Aso-Ebi, Aso-Oke & Event Merchandise Coordination  
**Date:** `2026-09-07`  
**Authority:** George Lawson, CEO of Maison Doclar  
**Starting baseline:** `9a79a443b7f08e727db12c9ea8dc4da8a557d8c0`  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Railway project:** `atelier-doclar` only  

## Decision

George Lawson ratifies:

- `docs/control/Maison_Doclar_EOS-S04C_Controlled_Slice_Pack_v1.0_DRAFT.docx`
- `docs/control/Maison_Doclar_EOS-S04C_Cursor_Prompt_Pack_v1.0.docx`

as the controlling EOS-S04C requirements and implementation packs, subject to this CEO authority overlay.

EOS-S04C is the canonical successor to accepted EOS-S04B.

| Field | Former | Current |
|-------|--------|---------|
| Status | `DRAFT FOR CEO RATIFICATION / IMPLEMENTATION NOT AUTHORISED` | `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS` |
| Prompt Control ID | none | `MD-PR-S020` |
| Catalogue slice | no | no — accepted-slice count remains 4 |
| Production | unauthorised | remains unauthorised |
| Protected gates | unsigned | remain unsigned |
| Coverage | not authorised | P00–P11 authorised |

EOS-S04D–F and EOS-S05 are **not** authorised by this decision.

## Controlling sources

| Document | Programme status after this decision |
|----------|--------------------------------------|
| CEO authority overlay (this instruction) | CONTROLLING for implementation, ordinary push and Railway deployment of affected `atelier-doclar` services |
| `docs/control/Maison_Doclar_EOS-S04C_Cursor_Prompt_Pack_v1.0.docx` | CONTROLLING implementation pack, subject to the overlay |
| `docs/control/Maison_Doclar_EOS-S04C_Controlled_Slice_Pack_v1.0_DRAFT.docx` | RATIFIED requirements source; filename retained as historical evidence |
| `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md` | CONTROLLING for ordinary push and Railway project `atelier-doclar` |

## Historical wording preserved as evidence

The following sentences remain in source packs and prior control files. They are **not** rewritten. They are superseded for current execution:

1. Controlled slice pack banner: `DRAFT FOR CEO RATIFICATION — implementation not authorised`.
2. Slice pack §18: approval of the draft does not itself authorise implementation.
3. Cursor prompt pack: `Push held for independent end-of-slice review`; `Railway … no action or deployment`.
4. Cursor prompt pack permanent control: Railway may be referenced for compatibility only.
5. `CURRENT_STATE.md` (before this record): `EOS-S04C IMPLEMENTATION AUTHORISED: NO`.
6. `DOCUMENT_AUTHORITY_REGISTER.md` addendum 2026-09-07: S04C packs listed as draft / not implementation authority.

**Superseding decision (2026-09-07):** this CEO instruction is the separate implementation-authority decision required by those records. Deploy-by-default remains controlling for verified work on `atelier-doclar`. Deployment is not slice acceptance and is not protected production authorisation.

## Reconciliation (not STOP)

No genuine contradiction was found that affects security, privacy, identity, access authority, event scoping or data integrity.

| Topic | Resolution |
|-------|------------|
| Push / Railway | Overlay and deploy-by-default supersede pack “held / no Railway” wording. |
| Draft vs ratified | Overlay ratifies both packs and authorises P00–P11. |
| Pack roles Merchandise Coordinator / Guest Concierge / Vendor Lead | Not invented as system roles. CEO, Event Director, Planner and Auditor remain the canonical staff roles. Coordinator and vendor-lead duties map to Event Director. Individual guest assistance maps to Planner within routine authority. Vendor User is a separate `VENDOR_CAPABILITY` session, not a staff role. |
| Vendor portal | No vendor app existed. Identity architecture can isolate vendors by adding a third session boundary, following guest-access isolation: separate cookie, HMAC, routes (`/vendor`), assignment-scoped capabilities, and no staff-permission inheritance. This is not CSS or navigation hiding. |
| Existing Guest / RSVP / Party / Phase authorities | Merchandise references those IDs and never mutates them. |

## Safeguards retained

- `productionAuthorised` remains `false`.
- No real clients, guests, vendors or personal data.
- No public access, external communications, payments, providers or biometrics.
- The only permitted body measurement is optional male-cap circumference in inches, with consent.
- No force-push, rebase, amend or history rewrite.
- No other repository or Railway project.
- Accepted EOS-S01–S04B contracts are not weakened.
- EOS-S04D–F and EOS-S05 are not started.
