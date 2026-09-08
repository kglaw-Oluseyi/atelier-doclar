# EOS-S05A Ratification and Foundation Milestone A Authority

**Slice ID:** `EOS-S05A`
**Product:** `EVENT_OS`
**Prompt Control ID:** `MD-PR-S037`
**Title:** Discovery, Investment & Executive Event Command
**Principal experience name:** Executive Event Command
**Date:** `2026-09-08`
**Authority:** George Lawson, CEO of Maison Doclar
**Starting baseline:** `ad69421026fe09b5d989252cadfe60eeac3cabf5`
**Baseline commit:** `docs(control): record MD-PR-UX001 without changing accepted slices`
**Repository:** `kglaw-Oluseyi/atelier-doclar`
**Branch:** `main`
**Railway project:** `atelier-doclar` only
**Permitted deployed service:** `event-os`

## Decision

George Lawson ratifies the EOS-S05A corpus as a controlled non-catalogue insert after accepted EOS-S05 and before historical EOS-S06. This record authorises canonical documentation of that corpus and implementation of Foundation Milestone A only (`EEC-00`–`EEC-10`).

This decision does **not** authorise `EEC-11`–`EEC-45`. It does **not** authorise EOS-S06. It does **not** accept EOS-S05A.

| Field | Former | Current |
|-------|--------|---------|
| Status | `CEO REVIEW DRAFT — NOT IMPLEMENTATION AUTHORITY` | `RATIFIED / FOUNDATION MILESTONE A AUTHORISED / NOT ACCEPTED` |
| Prompt Control ID | proposed `MD-PR-S037` | `MD-PR-S037` |
| Catalogue slice | no | no — accepted-slice count remains 5 |
| Execution released | none | `EEC-00`–`EEC-10` only |
| Later prompts | drafted | `EEC-11`–`EEC-45` ratified but unreleased |
| Production | unauthorised | remains unauthorised |
| Protected gates | unsigned | remain unsigned |
| Independent acceptance | not granted | not granted by this prompt |

`MD-PR-S036` remains an unexecuted recommendation for historical EOS-S06 Seating Allocation and is not consumed.

## Controlling sources

Canonical corpus location: `docs/control/eos-s05a/`. Original ratified filenames are preserved.

| Document | Path | Programme status after this decision |
|----------|------|--------------------------------------|
| CEO authority overlay (this instruction) | `docs/control/EOS_S05A_RATIFICATION.md` | CONTROLLING for Foundation Milestone A, ordinary push, and Railway deployment of Event OS in `atelier-doclar` after the authorised application work |
| Document 00 | `docs/control/eos-s05a/00_EXECUTIVE_EVENT_COMMAND_PACK_INDEX.md` | RATIFIED specification. Embedded “NOT IMPLEMENTATION AUTHORITY” wording is historical evidence. |
| Document 01 | `docs/control/eos-s05a/01_RATIFICATION_ARCHITECTURE_AND_COMPATIBILITY.md` | RATIFIED specification |
| Document 02 | `docs/control/eos-s05a/02_PRODUCT_DOMAIN_AND_DATA_SPECIFICATION.md` | RATIFIED specification |
| Document 02A | `docs/control/eos-s05a/02A_BUDGET_INTELLIGENCE_ENGINE_ADDENDUM.md` | RATIFIED specification. Faithful Markdown extract; Word pack remains the controlling source for 02A. |
| Document 03 | `docs/control/eos-s05a/03_AI_SAFETY_PRIVACY_UX_AND_EVALUATION.md` | RATIFIED specification |
| Volume 04A | `docs/control/eos-s05a/04A_CURSOR_PACK_CONTROL_AND_FOUNDATIONS.md` | CONTROLLING implementation volume for `EEC-00`–`EEC-10` |
| Volume 04B | `docs/control/eos-s05a/04B_CURSOR_PACK_BRIEF_AND_BUDGET_ENGINE.md` | RATIFIED; unreleased (`EEC-11`–`EEC-25`) |
| Volume 04C | `docs/control/eos-s05a/04C_CURSOR_PACK_ROADMAP_AI_AND_EXPERIENCE.md` | RATIFIED; unreleased (`EEC-26`–`EEC-40`) |
| Volume 04D | `docs/control/eos-s05a/04D_CURSOR_PACK_RELEASE_ASSURANCE_AND_REPORTING.md` | RATIFIED; unreleased (`EEC-41`–`EEC-45`) |
| Document 05 | `docs/control/eos-s05a/05_INDEPENDENT_VERIFICATION_AND_ACCEPTANCE.md` | RATIFIED verification model. Claude-in-Chrome is deferred until the whole slice is implemented. |
| Consolidated v2.0 Word pack | `docs/control/eos-s05a/Maison_Doclar_EOS_S05A_Detailed_Cursor_Prompt_Pack_v2.0.docx` | CONTROLLING ratified source for Document 02A and Volumes 04A–04D |
| Deploy-by-default policy | `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md` | CONTROLLING for ordinary push and Railway project `atelier-doclar` |

The detailed pack is controlling. Cursor must not reinterpret, simplify, summarise away or substitute another architecture for the ratified documents.

## Historical wording preserved as evidence

The following sentences remain in source packs. They are **not** rewritten. They are superseded for current execution by this overlay:

1. Document 00 status: `CEO REVIEW DRAFT — NOT IMPLEMENTATION AUTHORITY`.
2. Document 00: “EOS-S05A is not ratified; Cursor must not implement it; no repository or deployment change is authorised.”
3. Document 02A status: `CEO REVIEW / ADDITIVE RATIFICATION REQUIRED`.
4. Volumes 04A–04D status: `CEO REVIEW DRAFT — NOT IMPLEMENTATION AUTHORITY`.
5. Volume 04D: “Cursor must not execute from these draft volumes until that wrapper is visible to George and explicitly approved.”

**Superseding decision (2026-09-08):** `MD-PR-S037` is the CEO wrapper. It ratifies the corpus, authorises canonical documentation, and releases Foundation Milestone A only.

## Distinctions that must remain visible

| Concept | Meaning under this overlay |
|---------|----------------------------|
| Ratified specification | Documents 00–03, 02A, 05 and Volumes 04A–04D |
| Authorised implementation range | `EEC-00`–`EEC-10` |
| Ratified but unreleased prompts | `EEC-11`–`EEC-45` |
| Implementation | Cursor build and Event OS deployment of the authorised range |
| Independent acceptance | Not granted. Claude verifies later; Claude never accepts. Cursor does not accept. |

## Compatibility resolutions (not STOP)

| Topic | Controlling resolution |
|-------|------------------------|
| Catalogue accepted-slice count | Remains 5 (`EOS-S01`–`EOS-S05`). EOS-S05A is a non-catalogue insert. |
| EOS-S04A–F | Remain accepted non-catalogue successors. Not reopened. |
| Accepted EOS-S05 implementation SHA | Remains `eba137712c65c6f59b77fe2a88a8f4a277228cd9`. |
| `MD-PR-UX001` | Cross-slice UX uplift. Preserved. Not a new slice. |
| EOS-S06 | Remains Seating Allocation. `NOT_STARTED / NOT_AUTHORISED`. |
| `MD-PR-S036` | Unexecuted recommendation only. Not consumed. |
| Control Tower | Not a deploy target. Documentation or Event OS changes do not authorise a Control Tower deployment. |
| Production | `productionAuthorised` remains `false`. Synthetic data only. |
| Pre-engagement | Organisation → Engagement Opportunity → Discovery Engagement → Event Concept. Conversion is explicit and idempotent. |
| AI output | Proposal data only. Never governing truth without the governed human transition. |
| Money | Integer minor units and ISO currency. No JavaScript floating-point as durable money. |

## Safeguards retained

- `productionAuthorised` remains `false`.
- Synthetic data only.
- No real client, guest, vendor or financial data.
- No real AI, transcription, communications, payment, booking, banking or biometric provider activation.
- No email, WhatsApp or SMS.
- No payments, receipts, refunds or provider bookings.
- No secrets in prompts, commits, logs, screenshots or evidence.
- No Auditor or System Administrator implicit operational authority.
- No EOS-S06 seating allocation or seating solver.
- No force-push, rebase, amend or history rewrite.
- No other repository or Railway project.
- Accepted EOS-S01–S05 and EOS-S04A–F contracts are not weakened.

## Deployment rule for this prompt

The documentation commit does not deploy. Event OS is deployed once after the completed Foundation Milestone A application work, and only if Event OS/shared runtime or migrations changed. Control Tower is not redeployed.

Cursor implements and reports. Cursor does not independently accept EOS-S05A.
