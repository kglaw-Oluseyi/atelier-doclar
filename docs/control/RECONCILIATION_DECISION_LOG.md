# Reconciliation Decision Log

**Slice:** MD-B0  
**Date:** 2026-09-05  

Only decisions actually made during B0 are recorded. No CEO decisions were invented. Items requiring CEO or AI CTO authority beyond this slice are pending.

## RD-B0-001 — Preserve original paths (no source moves)

- **Date/time:** 2026-09-05
- **Issue:** Preferred `docs/` / `prompts/` / `programme/` layout vs provenance of recovered copies, `(1)` filenames, and pack folders.
- **Evidence considered:** 161-file tree; 18 hash-identical groups; RECOVERED/NEW filename semantics; B0 preservation law.
- **Decision:** Do not move, rename, merge, or delete source artefacts. Create control registers under `docs/control/` only. Publish a non-binding map in `CORPUS_LAYOUT.md`.
- **Authority:** B0 prompt — organise only where placement is sufficiently certain; do not sacrifice provenance.
- **Affected files:** All 161 original files (paths unchanged).
- **Consequences:** Repository root remains product-pack oriented. Preferred structure is recorded, not imposed.
- **Reversibility:** Yes. A later controlled placement slice can move files with this register as the before-state.
- **Unresolved follow-up:** CRQ-004, CRQ-005, CRQ-014.

## RD-B0-002 — Dual status recording (embedded draft vs programme authority)

- **Date/time:** 2026-09-05
- **Issue:** Many artefacts still say “DRAFT FOR CEO RATIFICATION” (or similar) while B0 states later CEO ratification is not automatically overridden by historical wording.
- **Evidence considered:** B0 §4 Ratification Rule; extracted first-page status legends; filenames containing DRAFT/RECOVERED/NEW/FINAL.
- **Decision:** Do not rewrite source documents. Record `embedded_status_wording` and `current_programme_authority_classification` separately on every inventory record.
- **Authority:** B0 §4.
- **Affected files:** Inventory metadata only.
- **Consequences:** Executors must read both fields.
- **Reversibility:** Yes.
- **Unresolved follow-up:** CRQ-006. CEO may later publish an express non-ratified list.

## RD-B0-003 — Do not select a programme ordering

- **Date/time:** 2026-09-05
- **Issue:** Multiple orderings exist (Control Tower instruction, programme.seed.json, Event OS 12-slice including Slice 8 Event-Day, Event-Day v2 as its own product).
- **Evidence considered:** Known flag B; extracted sources.
- **Decision:** Record variants. Do not silently adopt one interleaving.
- **Authority:** B0 §16.B — record, do not select.
- **Affected files:** None (no architecture rewrite).
- **Consequences:** CT0 must treat ordering as an open decision.
- **Reversibility:** n/a (non-decision).
- **Unresolved follow-up:** CRQ-007; GAP-012; GAP-013. **Pending CEO / AI CTO.**

## RD-B0-004 — Do not align slice schemas

- **Date/time:** 2026-09-05
- **Issue:** JSON slice-manifest schema vs Zod programme model.
- **Evidence considered:** Field lists; `additionalProperties: false` vs extra Zod fields.
- **Decision:** Record discrepancy. Do not redesign either artefact.
- **Authority:** B0 §16.C.
- **Affected files:** None.
- **Consequences:** CT1 cannot implement “the” schema without a later decision.
- **Reversibility:** n/a.
- **Unresolved follow-up:** CRQ-008; GAP-007. **Pending CEO / AI CTO.**

## RD-B0-005 — Single authorised GitHub repository; do not create others

- **Date/time:** 2026-09-05
- **Issue:** Academy/Marketing/Ushering materials assume product repositories.
- **Evidence considered:** Execution guides; B0 §2 and §16.D.
- **Decision:** Do not create another repository. Flag historical assumptions. Initialise Git only for `kglaw-Oluseyi/atelier-doclar` on `main`.
- **Authority:** B0 infrastructure boundary.
- **Affected files:** Git metadata only.
- **Consequences:** Later prompts must be adapted to this repository before execution.
- **Reversibility:** Creating extra repos would violate current authority.
- **Unresolved follow-up:** CRQ-009. **Pending adaptation before those prompts run.**

## RD-B0-006 — Prompt Control ID assignment method

- **Date/time:** 2026-09-05
- **Issue:** Need stable accountability IDs without replacing native IDs.
- **Evidence considered:** Extracted native IDs from packs; duplicate recovered copies; Academy 12-vs-8 ID gap.
- **Decision:** Assign `MD-PR-0001`–`MD-PR-0693` to unique execution prompt definitions. Map duplicate files as additional source paths of the same Prompt Control IDs. Do not invent missing native IDs. Do not give execution IDs to M0–M11 phase groups, U01–U14 modules, or S6-17 fence references.
- **Authority:** B0 §7–§8.
- **Affected files:** Prompt Register only.
- **Consequences:** 693 execution prompts; recovered copies do not double-count.
- **Reversibility:** IDs must not be recycled; corrections append status.
- **Unresolved follow-up:** CRQ-002, CRQ-003.

## RD-B0-007 — Claude wording preserved

- **Date/time:** 2026-09-05
- **Issue:** Historical Claude programme-role text remains in ratified-era files; successor handover removes Claude from the delivery workflow.
- **Evidence considered:** Known flag A; successor handover extract; CT standing contract.
- **Decision:** Preserve original wording. Flag CT0–CT9 and Claude-named planning docs for controlled adaptation before execution. Do not rewrite.
- **Authority:** B0 §16.A and preservation law.
- **Affected files:** None (flag only).
- **Consequences:** CT0 must not be executed until adaptation/authority is explicit.
- **Reversibility:** n/a.
- **Unresolved follow-up:** CRQ-012. **Pending before CT0.**

## RD-B0-008 — Initialise Git against the authorised empty remote

- **Date/time:** 2026-09-05
- **Issue:** Local folder had no `.git`. Target remote exists and is empty.
- **Evidence considered:** `git` preflight; `gh repo view kglaw-Oluseyi/atelier-doclar` → `isEmpty: true`; no other remotes inspected.
- **Decision:** `git init -b main`, add only that remote, one baseline commit, push `main`.
- **Authority:** B0 §21.
- **Affected files:** Git database; all tracked files.
- **Consequences:** First remote history.
- **Reversibility:** Standard Git history.
- **Unresolved follow-up:** None if push succeeds.

## Pending (not decided in B0)

| ID | Issue | Waiting on |
|----|-------|------------|
| PEND-001 | Single programme interleaving | CEO / AI CTO |
| PEND-002 | Schema alignment JSON vs Zod | CEO / AI CTO |
| PEND-003 | Native IDs for Academy prompts 09–12 | CEO / AI CTO |
| PEND-004 | CT standing-contract adaptation after Claude removal | CEO / AI CTO |
| PEND-005 | Canonical home for recovered copies | later control slice |
| PEND-006 | Express list of any non-ratified items | CEO |

---

# CT0 decisions (appended 2026-09-05)

B0 entries above are historical and unchanged.

## RD-CT0-001 — Adopt successor operating authority without rewriting sources

- **Date/time:** 2026-09-05
- **Issue:** CRQ-012 / PEND-004 — CT standing contract names Claude; successor handover removes Claude.
- **Evidence considered:** Successor handover; CT0–CT9 MD; B0 RD-B0-007; this MD-CT0 instruction §4.
- **Decision:** Create `EXECUTION_COMPATIBILITY_REGISTER.md`. Do not edit historical Claude wording.
- **Authority:** MD-CT0 §4 and §7.
- **Affected files:** New compatibility register only.
- **Consequences:** CT1+ must use the wrapper.
- **Reversibility:** Yes.
- **Unresolved follow-up:** CRQ-013 vendor assumption.

## RD-CT0-002 — Dependency DAG and executive critical path

- **Date/time:** 2026-09-05
- **Issue:** CRQ-007 / PEND-001 / RD-B0-003.
- **Evidence considered:** MD-CT0 §7.1–7.2; Control Tower instruction variants; Event-Day v2 README.
- **Decision:** DAG authoritative. Executive progression Foundation → Event OS foundations → Event-Day foundations → Ushering → Academy → Marketing → Integration → Validation. Runtime distinct from Event OS. Slice 8 mapped not double-built.
- **Authority:** MD-CT0 §7.1–7.2.
- **Affected files:** Roadmap, dependencies, slice catalog.
- **Consequences:** Display order in `programme.seed.json` is historical, not controlling.
- **Reversibility:** Yes, with a recorded amendment.
- **Unresolved follow-up:** CT0-GAP-005 line-by-line S8 map.

## RD-CT0-003 — Manifest vs SliceRecord remain distinct

- **Date/time:** 2026-09-05
- **Issue:** CRQ-008 / PEND-002 / RD-B0-004.
- **Evidence considered:** JSON Schema; Zod SliceRecord; MD-CT0 §7.3.
- **Decision:** Declaration vs projection. CT1 implements both and the mapping. No field deletion.
- **Authority:** MD-CT0 §7.3.
- **Affected files:** `programme/schema/SLICE_MANIFEST_VS_RECORD.md`.
- **Consequences:** CT1 scope is defined.
- **Reversibility:** n/a (boundary record).
- **Unresolved follow-up:** CT1 implementation.

## RD-CT0-004 — Single repository; logical modules

- **Date/time:** 2026-09-05
- **Issue:** CRQ-009 / PEND-005-adjacent.
- **Evidence considered:** MD-CT0 §7.4; B0 RD-B0-005.
- **Decision:** No other GitHub repository. Historical product-repo language = module.
- **Authority:** MD-CT0 §7.4.
- **Affected files:** Compatibility register; product YAML notes.
- **Consequences:** No `apps/` scaffold created in CT0.
- **Reversibility:** Creating extra remotes would violate current authority.
- **Unresolved follow-up:** Package path names.

## RD-CT0-005 — Prompt map uses MD-PR IDs; no renumbering

- **Date/time:** 2026-09-05
- **Issue:** CRQ-002, CRQ-003, 693-prompt estate.
- **Evidence considered:** Prompt Register; MD-CT0 §6, §7.5, §7.6.
- **Decision:** Map 693 prompts. Qualify IDs by product. Do not invent Academy native IDs. Do not mark SUPERSEDED without explicit evidence.
- **Authority:** MD-CT0.
- **Affected files:** `PROMPT_EXECUTION_MAP.json`.
- **Consequences:** 0 READY_AS_WRITTEN; 2 wrappers; 85 reconciliation; 606 blocked.
- **Reversibility:** Status can change when dependencies land; IDs never recycle.
- **Unresolved follow-up:** None for identity.

## Pending after CT0

| ID | Issue | Waiting on |
|----|-------|------------|
| CT0-OD-001 | Estate-wide UI framework lock (Next.js proposed for CT4+) | CEO before production UI |
| CT0-OD-002 | Identity provider product | CEO |
| CT0-OD-003 | Hosting / Railway | CEO; no Railway work in CT0 |
| CT0-OD-004 | Line-by-line Event OS S8 ↔ Runtime map | Later reconciliation slice |
| CT0-OD-005 | Whether to mint official Academy G0-09… native IDs | CEO |
| CT0-OD-006 | Intelligence / Anthropic vendor (CRQ-013) | CEO |
| CT0-OD-007 | Package manager confirmation (pnpm proposed) | AI CTO at CT1 start |
| PEND-006 | Express non-ratified list | CEO |

