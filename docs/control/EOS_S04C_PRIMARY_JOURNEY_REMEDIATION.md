# EOS-S04C primary-journey remediation

**Slice:** `EOS-S04C`  
**Prompt Control ID:** `MD-PR-S020`  
**Status:** `IN_REVIEW / NOT READY`  
**Starting baseline:** `267e3316347fb76e37cf21d80ba3a352e637d630`  
**Catalogue slice:** no  
**Production:** unauthorised  

Claude’s whole-slice verification confirmed three blocking acceptance defects. They are not verification inconvenience and are not deferred to EOS-S04D–F.

| ID | Defect | Classification |
|----|--------|----------------|
| TDR-S04C-001 | Staff could create a collection but could not complete item, phase scope, audience preview, offer issue/amend/withdraw | BLOCKING |
| TDR-S04C-002 | Merchandise guest access required an S03 RSVP invitation | BLOCKING |
| TDR-S04C-003 | Vendor portal was a dead fixture token labelled ready | BLOCKING |

## Remediation delivered

1. Guided staff studio: collection → item → audience preview → offer issue/withdraw, with empty-collection next actions.
2. Merchandise-only guest grants on `/offers`, separate cookie `md_event_os_offers`, hashed tokens, issue/renew/revoke, synthetic controls while `productionAuthorised=false`.
3. Vendor assignment issue/renew/revoke with accurate access-state seals. Access is labelled usable only when a currently presented synthetic link exists.
4. Consented cap circumference remains optional; consent is not preselected; centimetre and other measurements fail closed.
5. Forged payment and core-authority fields are rejected. Merchandise still does not write invitation, RSVP, attendance, credential or payment records.
6. Additive migration `EOS-S04C-MERCHANDISE-GUEST-GRANTS-V2` (empty grant/session collections; no RSVP backfill).

Passed Claude evidence retained without rerunning the whole slice: collection persistence, identity/cohort copy, 360px guest-directory.

EOS-S04D–F and EOS-S05 were not started. Control Tower was not deployed. EOS-S04C is not accepted.

Focused re-verification: `docs/control/EOS_S04C_FOCUSED_CLAUDE_REVERIFICATION.md`.
