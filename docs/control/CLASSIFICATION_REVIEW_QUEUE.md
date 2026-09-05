# Classification Review Queue

**Slice:** MD-B0  
**Date:** 2026-09-05  

Items that cannot be classified or resolved from evidence alone. Uncertainties were preserved, flagged and registered — not guessed away.

**Items:** 16

## CRQ-001 — Ushering U01–U14 are curriculum modules, not Cursor execution prompts

- **File / prompt:** `MD-Premium Usher system/10_Maison_Doclar_Academy_Premium_Ushering_Cursor_Reconciliation_Prompt_v1.0_DRAFT.docx`
- **Issue:** Document contains one authorised Cursor reconciliation prompt (MD-USH-ACA-010) and separately lists U01–U14 as course modules (knowledge/scenario/practical).
- **Probable classification(s) / options:**
  - Treat U01–U14 as curriculum IDs only (B0 treatment)
  - Reclassify any U-ID as an execution prompt if a paste-ready body is later shown
- **Competing evidence:** Contents section says '2. Cursor prompt' (singular); U01–U14 headings are module titles.
- **Potential impact:** Mis-counting would inflate ushering prompt totals.
- **Recommended classification if evidence supports one:** Keep B0 treatment: one execution prompt; U01–U14 accounted as non-execution native IDs.
- **CEO / AI CTO decision required:** NO (visibility only)
- **Blocks repository organisation:** NO
- **Blocks future implementation:** NO

## CRQ-002 — Academy native IDs missing for prompts 09–12 in every pack

- **File / prompt:** `MD Academy/16-cursor slice pack/*`
- **Issue:** Each of 17 packs claims 12 prompts. Bodies exist for 09–12. Native IDs located only through -08.
- **Probable classification(s) / options:**
  - Assign G0-09… later if CEO confirms that scheme
  - Leave positional-only as B0 did
- **Competing evidence:** Header '12 prompts' vs located IDs G0-01–G0-08 / Sxx-01–Sxx-08.
- **Potential impact:** Future execution needs a stable native ID convention for Academy verification/handover prompts.
- **Recommended classification if evidence supports one:** Do not invent G0-09 / Sxx-09 IDs. Accountability IDs already cover the bodies.
- **CEO / AI CTO decision required:** YES
- **Blocks repository organisation:** NO
- **Blocks future implementation:** YES

## CRQ-003 — Cross-product S-series ID collision

- **File / prompt:** `MDOS/slice10–12 vs MD Academy/16-cursor slice pack Slices 10–12`
- **Issue:** Academy S10-01 and Event OS S10-01BUILD (and S11/S12) share digit series.
- **Probable classification(s) / options:**
  - Always qualify IDs by product
  - Rename in a later controlled slice (not B0)
- **Competing evidence:** Different files, different products, overlapping native strings.
- **Potential impact:** Executor could open the wrong pack.
- **Recommended classification if evidence supports one:** Qualify by product in all future prompts. Do not rename in B0.
- **CEO / AI CTO decision required:** YES
- **Blocks repository organisation:** NO
- **Blocks future implementation:** YES

## CRQ-004 — Recovered vs original placement

- **File / prompt:** `document control pack/ vs product folders`
- **Issue:** 11 hash-identical recovered copies sit beside product-folder originals. Correct long-term placement is uncertain.
- **Probable classification(s) / options:**
  - Keep both in situ (B0)
  - Later declare one location canonical and the other recovered-evidence
- **Competing evidence:** Identical SHA-256; different folder semantics (RECOVERED vs original).
- **Potential impact:** Cosmetic moves could erase recovery provenance.
- **Recommended classification if evidence supports one:** Preserve both. Do not delete. Product folder is the apparent origin; document control pack is labelled RECOVERED.
- **CEO / AI CTO decision required:** NO (visibility only)
- **Blocks repository organisation:** NO
- **Blocks future implementation:** NO

## CRQ-005 — Event-Day root DOCX vs controlled-documents vs Markdown

- **File / prompt:** `event_day_runtime_complete_v2/`
- **Issue:** Seven DOCX files exist both at bundle root and in controlled-documents/ (hash-identical). Markdown equivalents exist under repository-specifications/. One People Roles root file is named with ' (1)'.
- **Probable classification(s) / options:**
  - Treat controlled-documents as the labelled controlled set
  - Treat root copies as operator-facing duplicates
- **Competing evidence:** README lists seven controlled documents; both locations exist.
- **Potential impact:** Unclear which path later slices should cite.
- **Recommended classification if evidence supports one:** Record as CONFIRMED DUPLICATE DOCX pairs plus MD format variants. Do not merge.
- **CEO / AI CTO decision required:** NO (visibility only)
- **Blocks repository organisation:** NO
- **Blocks future implementation:** NO

## CRQ-006 — Embedded DRAFT wording vs B0 ratification rule

- **File / prompt:** `Many files with DRAFT FOR CEO RATIFICATION / DRAFT_FOR_RATIFICATION`
- **Issue:** Historical embedded draft wording remains in source artefacts. B0 rule says later CEO ratification is not automatically overridden by that wording, but B0 must not silently rewrite it.
- **Probable classification(s) / options:**
  - Leave embedded wording intact and record dual status (B0)
  - CEO later issues an express non-ratified list
- **Competing evidence:** B0 ratification rule vs filenames and first-page DRAFT legends.
- **Potential impact:** Executors may treat DRAFT filenames as non-authoritative.
- **Recommended classification if evidence supports one:** Leave intact. Dual-record source-embedded status vs current programme authority.
- **CEO / AI CTO decision required:** NO (visibility only)
- **Blocks repository organisation:** NO
- **Blocks future implementation:** NO

## CRQ-007 — Programme product/phase ordering variants

- **File / prompt:** `Control Tower instruction vs programme.seed.json vs Event OS slice 8 vs Event-Day v2`
- **Issue:** Different ratified materials express different orderings. Event OS Slice 8 implements Event-Day Runtime inside Event OS; Event-Day v2 is a separate product with R0–R23.
- **Probable classification(s) / options:**
  - Do not select one ordering in B0
  - CEO/AI CTO later ratifies a single interleaving
- **Competing evidence:** See Gap Register and Decision Log RD-B0-003.
- **Potential impact:** CT0 and product builds cannot choose a critical path without this decision.
- **Recommended classification if evidence supports one:** Record variants. Do not silently prefer one.
- **CEO / AI CTO decision required:** YES
- **Blocks repository organisation:** NO
- **Blocks future implementation:** YES

## CRQ-008 — Slice-manifest schema vs Zod programme model

- **File / prompt:** `claude handover/roadmap_control_tower_addendum/schema/slice-manifest.schema.json vs contracts/programme-control.ts`
- **Issue:** JSON schema and Zod SliceRecord are not field-identical. JSON schema forbids additional properties. Zod requires status, commits, evidence, openItems, updatedAt, version and acceptance identity rules.
- **Probable classification(s) / options:**
  - Keep both as found (B0)
  - Later controlled alignment slice
- **Competing evidence:** See known flag C in B0 instructions.
- **Potential impact:** CT1 cannot implement both without a reconciliation decision.
- **Recommended classification if evidence supports one:** Record discrepancy. Do not redesign either in B0.
- **CEO / AI CTO decision required:** YES
- **Blocks repository organisation:** NO
- **Blocks future implementation:** YES

## CRQ-009 — Academy (and other) separate-repository assumptions vs single authorised target

- **File / prompt:** `document control pack/06_NEW_Maison_Doclar_Academy_Repository_and_Cursor_Execution_Guide_v1.0_DRAFT.docx (and Marketing/Ushering execution guides)`
- **Issue:** Academy execution guide describes 'the Academy repository' and a required repository skeleton. B0 authorises only kglaw-Oluseyi/atelier-doclar.
- **Probable classification(s) / options:**
  - Adapt later prompts to the single authorised repository
  - Do not create another repository
- **Competing evidence:** B0 infrastructure boundary vs Academy/Marketing/Ushering execution guides.
- **Potential impact:** Historical prompts would otherwise target a non-authorised repo.
- **Recommended classification if evidence supports one:** Flag only. Do not create another repository.
- **CEO / AI CTO decision required:** YES
- **Blocks repository organisation:** NO
- **Blocks future implementation:** YES

## CRQ-010 — Event OS Slice 1 filename (1) and People Roles (1)

- **File / prompt:** `MDOS/slice1/Maison_Doclar_Slice_1_Implementation_Specification_and_Build_Plan_v1.0 (1).docx; event_day_runtime_complete_v2/Maison_Doclar_Event_Day_Runtime_People_Roles_Staffing_and_Academy_Requirements_v2.0_DRAFT (1).docx`
- **Issue:** Download-style ' (1)' names. People Roles (1) is hash-identical to the controlled-documents copy without (1).
- **Probable classification(s) / options:**
  - Preserve names (B0)
  - Later rename with provenance record
- **Competing evidence:** Filename vs controlled-documents name.
- **Potential impact:** Tidying would hide download/recovery history.
- **Recommended classification if evidence supports one:** Preserve. Provenance of the extra filename is itself evidence.
- **CEO / AI CTO decision required:** NO (visibility only)
- **Blocks repository organisation:** NO
- **Blocks future implementation:** NO

## CRQ-011 — MD Reconcilliation folder spelling

- **File / prompt:** `MD Reconcilliation/`
- **Issue:** Folder name is misspelled. Not silently corrected.
- **Probable classification(s) / options:**
  - Preserve (B0)
  - Later rename with provenance
- **Competing evidence:** Spelling vs preferred docs/control or docs/handover placement.
- **Potential impact:** None if left in place.
- **Recommended classification if evidence supports one:** Preserve.
- **CEO / AI CTO decision required:** NO (visibility only)
- **Blocks repository organisation:** NO
- **Blocks future implementation:** NO

## CRQ-012 — Claude handover materials: supporting vs executable

- **File / prompt:** `claude handover/`
- **Issue:** Successor handover says former Claude handovers are supporting planning material only. CT0–CT9 still instruct Cursor to adopt Claude plans.
- **Probable classification(s) / options:**
  - Treat Claude planning docs as supporting until adapted
  - Adapt CT standing contract before CT0
- **Competing evidence:** Successor handover vs CT standing contract.
- **Potential impact:** CT0 as written would look for Claude planning artefacts.
- **Recommended classification if evidence supports one:** Preserve original wording. Adaptation is a later controlled action, not B0.
- **CEO / AI CTO decision required:** YES
- **Blocks repository organisation:** NO
- **Blocks future implementation:** YES

## CRQ-013 — Intelligence Specification 'Final Draft' and Claude-as-API mention

- **File / prompt:** `MDOS/Maison_Doclar_Intelligence_Specification_v1.0_Final_Draft.docx`
- **Issue:** Filename says Final Draft. Body mentions calling Claude models via Anthropic API as a product capability, not a programme-lead role.
- **Probable classification(s) / options:**
  - Treat as product-capability wording
  - Later confirm whether the vendor/model constraint still stands
- **Competing evidence:** Filename Final Draft vs B0 ratification rule; Anthropic/Claude API sentence.
- **Potential impact:** Future intelligence slices may assume a specific model vendor.
- **Recommended classification if evidence supports one:** Do not treat as a programme-role Claude reference. Flag vendor assumption for later review.
- **CEO / AI CTO decision required:** YES
- **Blocks repository organisation:** NO
- **Blocks future implementation:** NO

## CRQ-014 — Preferred folder pattern vs preserved provenance folders

- **File / prompt:** `Repository root`
- **Issue:** B0 preferred docs/prompts/programme layout is a target pattern. Original product-pack folders already encode recovery and pack identity.
- **Probable classification(s) / options:**
  - Preserve in situ (B0 decision RD-B0-001)
  - Later move with a dedicated provenance slice
- **Competing evidence:** B0 section 17 preferred structure vs section 3 provenance law.
- **Potential impact:** Moving now would risk losing RECOVERED vs original distinction.
- **Recommended classification if evidence supports one:** No source file was moved. Control registers live under docs/control/. Proposed mapping is in CORPUS_LAYOUT.md only.
- **CEO / AI CTO decision required:** NO (visibility only)
- **Blocks repository organisation:** NO
- **Blocks future implementation:** NO

## CRQ-015 — Event-Day v1 pack referenced but not located

- **File / prompt:** `event_day_runtime_complete_v2/README.md`
- **Issue:** README says the bundle supersedes Event-Day Edge Runtime v1.0 in full. v1 files are not in this corpus.
- **Probable classification(s) / options:**
  - Accept absence as a gap
  - CEO later supplies v1 if needed for history
- **Competing evidence:** README supersession claim vs missing v1 files.
- **Potential impact:** Cannot verify what v2 superseded.
- **Recommended classification if evidence supports one:** Do not invent v1. Record as gap. v2 is the located Event-Day authority in this folder.
- **CEO / AI CTO decision required:** NO (visibility only)
- **Blocks repository organisation:** NO
- **Blocks future implementation:** NO

## CRQ-016 — Control Tower planning artefacts required by CT docs are absent

- **File / prompt:** `claude handover/roadmap_control_tower_addendum/`
- **Issue:** Master Roadmap instruction requires PROGRAMME_ROADMAP.md, product/phase/slice YAML, and prompts/control-tower/*.md. Those outputs are not in the corpus (they are CT-planning deliverables, not B0).
- **Probable classification(s) / options:**
  - Leave as expected future CT planning outputs
  - Do not generate them in B0
- **Competing evidence:** Instruction-to-Claude deliverable list vs current tree.
- **Potential impact:** CT0/CT1 expect these files.
- **Recommended classification if evidence supports one:** Do not create them in B0. They would start CT work.
- **CEO / AI CTO decision required:** NO (visibility only)
- **Blocks repository organisation:** NO
- **Blocks future implementation:** YES

