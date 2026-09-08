# EOS-S05A Build Ledger

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S037`
**Starting baseline:** `ad69421026fe09b5d989252cadfe60eeac3cabf5`
**Status:** `RATIFIED / FOUNDATION MILESTONE A AUTHORISED / NOT ACCEPTED`
**Production:** unauthorised
**Catalogue accepted-slice count:** remains 5
**Next authorised range:** `EEC-00`–`EEC-10`
**Unreleased ratified range:** `EEC-11`–`EEC-45`
**EOS-S06:** `NOT_STARTED / NOT_AUTHORISED`

## Foundation Milestone A — control, architecture and discovery foundations

Historic / pack units: `EEC-00`–`EEC-10`. Later units remain ratified but unreleased.

| Unit | Title | Status at documentation commit |
|------|-------|--------------------------------|
| EEC-00 | Baseline, authority ingestion and compatibility ledger | Documentation/authority records created; application behaviour not added |
| EEC-01 | Bounded-context ADR and package architecture | NOT STARTED |
| EEC-02 | Permission catalogue and role-safe projection | NOT STARTED |
| EEC-03 | Identifiers, primitives and assertion ontology | NOT STARTED |
| EEC-04 | Persistence, indexes and additive migration | NOT STARTED |
| EEC-05 | Engagement opportunity and discovery engagement | NOT STARTED |
| EEC-06 | Consent, participants and interview-session lifecycle | NOT STARTED |
| EEC-07 | Source artefacts, transcript segments and provenance | NOT STARTED |
| EEC-08 | Coverage catalogue and applicability engine | NOT STARTED |
| EEC-09 | Candidate assertion extraction and human review | NOT STARTED |
| EEC-10 | Contradiction, staleness and clarification | NOT STARTED |

## Canonical corpus

| Kind | Path |
|------|------|
| Document 00 | `docs/control/eos-s05a/00_EXECUTIVE_EVENT_COMMAND_PACK_INDEX.md` |
| Document 01 | `docs/control/eos-s05a/01_RATIFICATION_ARCHITECTURE_AND_COMPATIBILITY.md` |
| Document 02 | `docs/control/eos-s05a/02_PRODUCT_DOMAIN_AND_DATA_SPECIFICATION.md` |
| Document 02A | `docs/control/eos-s05a/02A_BUDGET_INTELLIGENCE_ENGINE_ADDENDUM.md` |
| Document 03 | `docs/control/eos-s05a/03_AI_SAFETY_PRIVACY_UX_AND_EVALUATION.md` |
| Volume 04A | `docs/control/eos-s05a/04A_CURSOR_PACK_CONTROL_AND_FOUNDATIONS.md` |
| Volume 04B | `docs/control/eos-s05a/04B_CURSOR_PACK_BRIEF_AND_BUDGET_ENGINE.md` |
| Volume 04C | `docs/control/eos-s05a/04C_CURSOR_PACK_ROADMAP_AI_AND_EXPERIENCE.md` |
| Volume 04D | `docs/control/eos-s05a/04D_CURSOR_PACK_RELEASE_ASSURANCE_AND_REPORTING.md` |
| Document 05 | `docs/control/eos-s05a/05_INDEPENDENT_VERIFICATION_AND_ACCEPTANCE.md` |
| Consolidated Word pack | `docs/control/eos-s05a/Maison_Doclar_EOS_S05A_Detailed_Cursor_Prompt_Pack_v2.0.docx` |

Document 02A and Volumes 04A–04D are faithful Markdown representations extracted from the consolidated Word pack. The Word file remains the controlling ratified source for those parts.

## Deployment

Documentation commit: no Railway deployment. Event OS deployment is deferred until Foundation Milestone A application work is complete and only if Event OS/shared runtime or migrations changed. Control Tower is not a deploy target.
