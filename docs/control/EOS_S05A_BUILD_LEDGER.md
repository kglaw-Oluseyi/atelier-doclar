# EOS-S05A Build Ledger

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S037`
**Starting baseline:** `ad69421026fe09b5d989252cadfe60eeac3cabf5`
**Documentation SHA:** `32cde9f74f78482f182d29ea9e32a7f4e180eaa6`
**Status:** `RATIFIED / FOUNDATION MILESTONE A IMPLEMENTED / NOT ACCEPTED`
**Production:** unauthorised
**Catalogue accepted-slice count:** remains 5
**Implemented range:** `EEC-00`–`EEC-10`
**Unreleased ratified range:** `EEC-11`–`EEC-45`
**EOS-S06:** `NOT_STARTED / NOT_AUTHORISED`

## Foundation Milestone A — control, architecture and discovery foundations

| Unit | Title | Status |
|------|-------|--------|
| EEC-00 | Baseline, authority ingestion and compatibility ledger | COMPLETE |
| EEC-01 | Bounded-context ADR and package architecture | COMPLETE |
| EEC-02 | Permission catalogue and role-safe projection | COMPLETE |
| EEC-03 | Identifiers, primitives and assertion ontology | COMPLETE |
| EEC-04 | Persistence, indexes and additive migration | COMPLETE |
| EEC-05 | Engagement opportunity and discovery engagement | COMPLETE |
| EEC-06 | Consent, participants and interview-session lifecycle | COMPLETE |
| EEC-07 | Source artefacts, transcript segments and provenance | COMPLETE for staff notes; binary upload deferred |
| EEC-08 | Coverage catalogue and applicability engine | COMPLETE |
| EEC-09 | Candidate assertion extraction and human review | COMPLETE |
| EEC-10 | Contradiction, staleness and clarification | COMPLETE |

## Application commits

| SHA | Message |
|-----|---------|
| `32cde9f74f78482f182d29ea9e32a7f4e180eaa6` | `docs(control): ratify EOS-S05A executive event command` |
| `bcfc3ba` | `feat(platform): add EOS-S05A discovery foundation domain` |
| `cdf1cce` | `feat(event-os): add discovery Command Atelier foundation surfaces` |

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

## First-run failures

| Command | Classification | Root cause | Correction | Rerun |
|---------|----------------|------------|------------|-------|
| Shared-platform `getDiscoveryWorkspace` capability filter | Product defect | `permissionAllowed` received `ActorContext` instead of `ActorSnapshot` | Filter with `ctx.actor` | 7/7 EEC platform tests pass |
| `pnpm typecheck` | Product defect | `CoverageState` type not exported; Home empty-state JSX lacked a parent | Export type; wrap fragment | `pnpm typecheck` pass |
| Focused E2E assertion label | Product defect | Fixture extraction stores `EXTRACTED`, so review controls were hidden and the label said “Proposal” | Treat `EXTRACTED` as a reviewable AI proposal | Focused E2E pass |
| Focused E2E coverage locator | Test defect | Asserted `data-testid="discovery-coverage"` which was only a section id | Assert `discovery-coverage-list` contains `Conflicted` | Focused E2E pass |
| Focused E2E auditor copy | Test defect | Blocked-review copy appears once per assertion | Use `.first()` | Focused E2E pass |

## Carried debt

| ID | Note |
|----|------|
| TDR-S05A-001 | EEC-07 binary/object-storage source artefacts are not implemented. Milestone A records typed staff notes with inert text, checksummed segments and fixture extraction only. |
| TDR-S05A-002 | Opportunity close and owner-assignment UI are service-backed but not exposed as dedicated Command Atelier forms. |

## Deployment

Documentation commit: no Railway deployment. Event OS is deployed once after Foundation Milestone A application work because shared runtime and the additive migration changed. Control Tower is not a deploy target.
