# EOS-S04F Ratification and Implementation Authority

**Slice ID:** `EOS-S04F`  
**Product:** `EVENT_OS`  
**Prompt Control ID:** `MD-PR-S026`  
**Title:** Language, Cultural Text & Multilingual Editions  
**Date:** `2026-09-07`  
**Authority:** George Lawson, CEO of Maison Doclar  
**Starting baseline:** `2663f4363ad311f486f05c70e8e8411d5e9830bb`  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Railway project:** `atelier-doclar` only  

## Decision

George Lawson ratifies:

- `docs/control/Maison_Doclar_EOS-S04F_Controlled_Slice_Pack_v1.0_DRAFT.docx`
- `docs/control/Maison_Doclar_EOS-S04F_Cursor_Prompt_Pack_v1.0_DRAFT.docx`

as the controlling EOS-S04F requirements and implementation packs, subject to this CEO authority overlay.

EOS-S04F is the canonical successor to accepted EOS-S04E.

| Field | Former | Current |
|-------|--------|---------|
| Status | `HELD / CEO REVIEW / NOT IMPLEMENTATION AUTHORITY` | `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS` |
| Prompt Control ID | none | `MD-PR-S026` |
| Catalogue slice | no | no — accepted-slice count remains 4 |
| Production | unauthorised | remains unauthorised |
| Protected gates | unsigned | remain unsigned |
| Coverage | not authorised | P00–P11 authorised |

EOS-S05 is **not** authorised by this decision.

## Controlling sources

| Document | Programme status after this decision |
|----------|--------------------------------------|
| CEO authority overlay (this instruction) | CONTROLLING for implementation, ordinary push and Railway deployment of Event OS in `atelier-doclar` |
| `docs/control/Maison_Doclar_EOS-S04F_Cursor_Prompt_Pack_v1.0_DRAFT.docx` | CONTROLLING implementation pack, subject to the overlay |
| `docs/control/Maison_Doclar_EOS-S04F_Controlled_Slice_Pack_v1.0_DRAFT.docx` | RATIFIED requirements source; filename retained as historical evidence |
| `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md` | CONTROLLING for ordinary push and Railway project `atelier-doclar` |

## Historical wording preserved as evidence

The following sentences remain in source packs and prior control files. They are **not** rewritten. They are superseded for current execution:

1. Controlled slice pack status: `CEO REVIEW / NOT YET RATIFIED`.
2. Controlled slice pack: “Implementation is held until CEO ratification.”
3. Controlled slice pack close: `HELD` / “this draft is not implementation authority.”
4. Cursor prompt pack status: `HELD — NOT IMPLEMENTATION AUTHORITY`.
5. Cursor pack: “Push / deploy: Prohibited” on P00–P11; P11 “STOP before push and deployment.”
6. `CURRENT_STATE.md` (before this record): EOS-S04F `HELD` / implementation not authorised.

**Superseding decision (2026-09-07):** this CEO instruction is the separate implementation-authority decision required by those records. Deploy-by-default remains controlling for verified work on `atelier-doclar`. Deployment is not slice acceptance and is not protected production authorisation.

## Reconciliation (not STOP)

No genuine contradiction was found that affects security, privacy, identity, access authority, event scoping or data integrity.

| Topic | Resolution |
|-------|------------|
| Push / Railway | Overlay and deploy-by-default supersede pack “held / no Railway” wording. Push and deploy Event OS in `atelier-doclar`. |
| Draft vs ratified | Overlay ratifies both packs and authorises P00–P11. |
| Slice-pack vs Cursor-pack / CEO overlay record names | One canonical mapping; see `EOS_S04F_CANONICAL_RECORD_MAPPING.md`. Different labels do not become two tables. |
| Language vs locale vs edition | Distinct concepts. Closed allowlist: `en-GB`, `en-US`, `yo`, `ig`, `ha`, `fr`, `de-DE`, `zh-Hans`. Default terminal fallback `en-GB`. |
| Preference vs English | Unknown is first-class. Missing preference is never stored as English consent. |
| Cultural text vs ordinary copy | Cultural source texts have provenance, reviewer and approval. Synthetic fixtures are labelled unvalidated. |
| Translation vs dispatch | S04F assembles approved recipient content. EOS-S04 retains campaign and send authority. |
| Persistence | Additive snapshot collections plus migration receipt `EOS-S04F-LANGUAGE-V1`. Not a second guest, RSVP, campaign or Atelier ledger. |
| Existing authorities | S03 invitation/RSVP, S04 communications, S04A addressing, S04B programme, S04C merchandise, S04D forecast and S04E Atelier remain owners. |

## Safeguards retained

- `productionAuthorised` remains `false`.
- No real recipients, client or guest data.
- No email, WhatsApp or SMS dispatch.
- No translation-provider calls or AI approval.
- No payments, biometrics or protected-gate signatures.
- No force-push, rebase, amend or history rewrite.
- No other repository or Railway project.
- Accepted EOS-S01–S04E contracts are not weakened.
- EOS-S05 is not started.
