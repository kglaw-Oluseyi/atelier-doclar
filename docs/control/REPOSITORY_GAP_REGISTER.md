# Repository Gap Register

**Slice:** MD-B0  
**Date:** 2026-09-05  

Gaps discovered while establishing the baseline. Substantive programme gaps were not “fixed” in B0 except the control-register structure required to make the baseline auditable.

## Expected documents / packs not found

| ID | Gap | Evidence | B0 action |
|----|-----|----------|-----------|
| GAP-001 | Event-Day Edge Runtime v1.0 pack | v2 README says it supersedes v1 in full | Flagged; v1 not invented |
| GAP-002 | Control Tower planning outputs (`PROGRAMME_ROADMAP.md`, `programme/products/*.yaml`, `prompts/control-tower/*.md`, etc.) | Required by Claude Master Roadmap instruction | Not created; would be CT planning work |
| GAP-003 | Application repository (package manifest, source, tests, CI) | Filesystem has none | Recorded |
| GAP-004 | Academy native IDs G0-09–G0-12 and Sxx-09–Sxx-12 | Packs claim 12 prompts; IDs stop at 08 | Bodies registered; IDs not invented |
| GAP-005 | Event-Day v1 FaceGate / OS modules that R0 says to inventory | R0 assumes existing check-in/guest/access/FaceGate code | None present |

## Prompt sequence gaps

See Prompt Register. No missing CT or R number. Academy 09–12 lack native IDs. S6-17–S9-17 are fence references, not missing bodies.

## Missing schemas

| ID | Gap | Notes |
|----|-----|-------|
| GAP-006 | No Event OS / Academy / Marketing / Ushering machine schemas except Event-Day reference contracts and Control Tower programme contracts | Product data models exist as DOCX, not as repo schemas |
| GAP-007 | Slice-manifest JSON Schema ≠ Zod SliceRecord | Known flag C |

## Missing control records (before B0)

No prior `docs/control` registers existed. B0 creates them.

## Broken / unverified references

| ID | Reference | Status |
|----|-----------|--------|
| GAP-008 | CT standing contract → Claude inspect/add/modify/migrate/generate/protect manifest | Manifest file not located as a standalone artefact |
| GAP-009 | Many prompts cite `BUILD_LEDGER.md`, `CURRENT_STATE.md`, `DECISION_LOG.md`, `AGENTS.md` | Not present |
| GAP-010 | Academy/Marketing/Ushering “required repository skeleton” | Not present; separate-repo assumption flagged |
| GAP-011 | programme.seed.json `sourceCommit` is forty zeros | Placeholder, not a real commit |

## Missing evidence

No implementation evidence, test logs, screenshots, or acceptance signatures exist. Acceptance packs are documents, not completed evidence.

## Unresolved placement

See Duplicate Register and CRQ-004, CRQ-005, CRQ-010, CRQ-014.

## Contradictory architecture / ordering assumptions

| ID | Conflict | Sources |
|----|----------|---------|
| GAP-012 | Event-Day Runtime as Event OS Slice 8 vs separate Event-Day v2 R-series | MDOS slice8 pack vs event_day_runtime_complete_v2 |
| GAP-013 | Product order Foundation→Event OS→Academy→… vs seed order FOUNDATION, EVENT_OS, ACADEMY, MARKETING, USHERING, EVENT_DAY, INTEGRATION vs Event OS 12-slice monolith | Control Tower instruction §4; programme.seed.json; MDOS packs |
| GAP-014 | Clean-slate Marketing / Event OS S1 vs reconciliation bundles that assume an existing repository vs single authorised empty GitHub repo | M0–M11, S1-01, OS-R/AC-R, B0 boundary |
| GAP-015 | Claude as planner/executor in CT materials vs Claude removed in successor handover | CT0–CT9; Successor Instance Handover |
| GAP-016 | Historical “create Academy/Marketing/Ushering repositories” vs single authorised target `kglaw-Oluseyi/atelier-doclar` | Execution guides vs B0 boundary |

## Missing executable foundations

No monorepo, identity, tenancy, CI, database, hosting, or design-system implementation. Foundation is documentary only.

## Files that do not exist but are referenced

See GAP-002, GAP-008, GAP-009, GAP-001.

## What B0 did not fill

B0 did not write product YAML, did not extract prompt bodies into `prompts/`, did not start CT0, and did not create application scaffolding.

---

## CT0 addendum (2026-09-05)

GAP-002 planning outputs were created in CT0 (`docs/control/PROGRAMME_*.md`, `programme/`). See `CT0_GAP_REGISTER.md` for remaining and newly identified gaps. Historical originals were not rewritten.
