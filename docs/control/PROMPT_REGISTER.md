# Maison Doclar Prompt Register

**Slice:** MD-B0  
**Generated:** 2026-09-05  
**Scheme:** `MD-PR-NNNN` accountability identifiers. Native/original prompt IDs are preserved and mapped, never replaced.

Finding a prompt is not authority to execute it. No historical prompt was executed during B0.

## Prompt Accountability Summary

| Measure | Count |
|---------|------:|
| Original corpus files inspected for prompts | 161 |
| Execution prompts identified | 693 |
| Unique Prompt Control IDs assigned | 693 |
| Prompts confidently classified | 625 |
| Prompts requiring review | 68 |
| Prompts whose native ID was not located (positional body only) | 68 |
| Orphan prompts (no source document) | 0 |
| Prompts with unresolved dependencies | 693 |
| Prompts containing historical Claude-role assumptions | 10 |

### Reconciliation identity

```
693 identified execution prompts
= 693 unique Prompt Control IDs
= 625 high-confidence + 68 review-required
= sum(by product) = sum(by family) = sum(by status)
Orphan prompts = 0
Unaccounted prompts = 0
PROMPT ACCOUNTING RECONCILES: YES
```

### Count by product

| Product | Execution prompts |
|---------|------------------:|
| FOUNDATION | 10 |
| EVENT_DAY | 24 |
| EVENT_OS | 392 |
| ACADEMY | 218 |
| MARKETING | 48 |
| USHERING | 1 |
| **TOTAL** | **693** |

Product total 10+24+392+218+48+1 = 693.

### Count by prompt family

| Family | Count |
|--------|------:|
| `ACADEMY_G0` | 12 |
| `ACADEMY_RECONCILIATION` | 14 |
| `ACADEMY_S01` | 12 |
| `ACADEMY_S02` | 12 |
| `ACADEMY_S03` | 12 |
| `ACADEMY_S04` | 12 |
| `ACADEMY_S05` | 12 |
| `ACADEMY_S06` | 12 |
| `ACADEMY_S07` | 12 |
| `ACADEMY_S08` | 12 |
| `ACADEMY_S09` | 12 |
| `ACADEMY_S10` | 12 |
| `ACADEMY_S11` | 12 |
| `ACADEMY_S12` | 12 |
| `ACADEMY_S13` | 12 |
| `ACADEMY_S14` | 12 |
| `ACADEMY_S15` | 12 |
| `ACADEMY_S16` | 12 |
| `CONTROL_TOWER_CT` | 10 |
| `EVENT_DAY_R` | 24 |
| `EVENT_OS_RECONCILIATION` | 13 |
| `EVENT_OS_S1` | 39 |
| `EVENT_OS_S10` | 18 |
| `EVENT_OS_S11` | 18 |
| `EVENT_OS_S12` | 18 |
| `EVENT_OS_S2` | 46 |
| `EVENT_OS_S3` | 50 |
| `EVENT_OS_S4` | 62 |
| `EVENT_OS_S5` | 60 |
| `EVENT_OS_S6` | 17 |
| `EVENT_OS_S7` | 17 |
| `EVENT_OS_S8` | 17 |
| `EVENT_OS_S9` | 17 |
| `MARKETING_M_LETTERED` | 48 |
| `USHERING_ACADEMY_RECONCILIATION` | 1 |
| **TOTAL** | **693** |

### Count by apparent status

| Status | Count |
|--------|------:|
| NOT_EXECUTED | 693 |

All 693 are `NOT_EXECUTED`. None were run during B0.

### Native IDs vs newly assigned accountability IDs

- **Native IDs retained:** CT0–CT9; R0–R23; Event OS S1-01–S5-60 and S6-00BUILD–S12-17BUILD; Academy G0-01–G0-08 and S01-01–S16-08; Marketing M0A–M11D; OS-R00–OS-R12; AC-R00–AC-R13; MD-USH-ACA-010.
- **Newly assigned:** only `MD-PR-0001`–`MD-PR-0693` as accountability IDs. No native ID was overwritten.
- **Positional bodies without located native IDs (68):** Academy Gate 0 and Slices 01–16 prompts 09–12. Accountability IDs use the form `G0-P09[NO_NATIVE_ID]` / `S01-P09[NO_NATIVE_ID]` etc. Native IDs `G0-09`…`G0-12` and `Sxx-09`…`Sxx-12` were **not invented**.

### Apparent missing sequence members

- **ACADEMY_G0 / ACADEMY_S01–S16:** Pack headers require 12 prompts; native IDs located only through -08. Positional prompts 09–12 exist as bodies without G0-09 / Sxx-09 IDs. Invented: False.
- **EVENT_OS_S6–S9:** Packs say 'Do not begin S6-17' (and S7-17/S8-17/S9-17). These are fence references, not located prompt bodies. Not invented. Invented: False.
- **EVENT_DAY_V1:** v2 README states the earlier Event-Day Edge Runtime v1.0 pack is superseded and not authorised. v1 pack is not located in this corpus. Invented: False.

Event-Day R0–R23 is complete. Control Tower CT0–CT9 is complete. Marketing lettered M0A–M11D is complete (48). Event OS recon OS-R00–OS-R12 is complete (13). Academy recon AC-R00–AC-R13 is complete (14).

### Duplicate-ID conflicts

- Academy native S10-01..S10-08 vs Event OS S10-00BUILD..S10-17BUILD — same digit series, different products
- Academy native S11-01..S11-08 vs Event OS S11-00BUILD..S11-17BUILD — same digit series, different products
- Academy native S12-01..S12-08 vs Event OS S12-00BUILD..S12-17BUILD — same digit series, different products
- Academy `S01-*` vs Event OS `S1-*` use different zero-padding but share the S-series pattern. Treat as cross-product collision risk, not the same prompt.

### Duplicate-content candidates

- CONFIRMED hash-identical recovered copies of Event OS recon, Academy recon, Marketing M0–M11, and Ushering recon packs (see Duplicate Register).
- Event-Day R0–R23 DOCX appears twice (root + `controlled-documents/`) with identical SHA-256; Markdown is a format variant.
- Control Tower CT0–CT9 exists as DOCX + Markdown format pair.
- Academy packs share template-identical positional titles 01–12; file hashes differ; treat as POTENTIAL template-duplicate, not confirmed identical bodies.

### Orphan prompts

None. Every execution prompt maps to a source document and current path.

### Unresolved dependencies

Almost all implementation prompts assume an application repository, existing Event OS/Academy code, or Claude planning artefacts that are **not present** in this corpus. See Gap Register. This does not make the prompts orphans; it makes them blocked for execution until those foundations exist.

### Historical Claude-role references

All ten CT0–CT9 prompts (`MD-PR-0001`–`MD-PR-0010`) contain standing-contract instructions to apply the prior Claude handover and to use “Claude’s exact inspect/add/modify/migrate/generate/protect manifest”. CT0 is titled “Preflight and Claude-plan adoption”. Original wording is preserved. Flagged for controlled adaptation before execution. Successor handover (`Maison_Doclar_Successor_Instance_Handover_v1.0.docx`) is the later programme-authority record removing Claude from the delivery workflow.

### Non-execution native IDs observed (accounted, not given execution Prompt Control IDs)

| Class | IDs | Treatment |
|-------|-----|-----------|
| Marketing phase groups | M0–M11 | Phase groupings; execution units are M0A–M11D |
| Ushering curriculum modules | U01–U14 | Course/module IDs inside the single ushering recon prompt; see CRQ-001 |
| Event OS fence references | S6-17, S7-17, S8-17, S9-17 | “Do not begin” boundary markers; no prompt body located; not invented |

These IDs are not hidden in an “other” execution-prompt bucket.

## Prompt families and expected sequence

### Control Tower CT0–CT9

| Prompt Control ID | Native ID | Title | Source |
|-------------------|-----------|-------|--------|
| MD-PR-0001 | CT0 | Preflight and Claude-plan adoption | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |
| MD-PR-0002 | CT1 | Programme domain and manifest validator | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |
| MD-PR-0003 | CT2 | Persistence, snapshots and status calculator | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |
| MD-PR-0004 | CT3 | Repository and CI ingestion | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |
| MD-PR-0005 | CT4 | Control Tower shell and executive portfolio | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |
| MD-PR-0006 | CT5 | Roadmap, product and slice drill-down | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |
| MD-PR-0007 | CT6 | Open items, decisions, gates, releases and audit | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |
| MD-PR-0008 | CT7 | RAG ingestion and grounded programme assistant | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |
| MD-PR-0009 | CT8 | Charts, notifications and update freshness | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |
| MD-PR-0010 | CT9 | Operations, full acceptance and release evidence | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` |

### Event-Day Runtime R0–R23

| Prompt Control ID | Native ID | Title |
|-------------------|-----------|-------|
| MD-PR-0011 | R0 | Repository preflight and supersession |
| MD-PR-0012 | R1 | Domain kernel and runtime state machine |
| MD-PR-0013 | R2 | Departmental projection registry |
| MD-PR-0014 | R3 | Package builder and minimisation |
| MD-PR-0015 | R4 | Package freeze, manifest, signature and import |
| MD-PR-0016 | R5 | Local persistence and immutable ledger |
| MD-PR-0017 | R6 | Local identity, device registry and certificate enrolment |
| MD-PR-0018 | R7 | PWA shell and pinned local assets |
| MD-PR-0019 | R8 | Scan and lookup platform |
| MD-PR-0020 | R9 | Initial human check-in surface |
| MD-PR-0021 | R10 | Greeter, protocol and guest-relations surfaces |
| MD-PR-0022 | R11 | Seating, ushering and guest service surfaces |
| MD-PR-0023 | R12 | Department lead workspaces |
| MD-PR-0024 | R13 | Self-scan kiosk |
| MD-PR-0025 | R14 | Client emergency outbox |
| MD-PR-0026 | R15 | FaceGate consented enrolment and return-only gateway |
| MD-PR-0027 | R16 | Command console, health and degradation |
| MD-PR-0028 | R17 | Staff deployment, shifts and Academy gates |
| MD-PR-0029 | R18 | Incidents, safety, service recovery and fallback |
| MD-PR-0030 | R19 | Close, drain, seal and encrypted export |
| MD-PR-0031 | R20 | Deterministic cloud reconciliation |
| MD-PR-0032 | R21 | Deployment, configuration, backup and recovery |
| MD-PR-0033 | R22 | Full automated and browser acceptance |
| MD-PR-0034 | R23 | Evidence pack and release locks |

Source: `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` (plus hash-identical DOCX pair).

### Event OS slice packs

| Slice | Native sequence | Count | Source pack |
|-------|-----------------|------:|-------------|
| 1 | S1-01 … S1-39 | 39 | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` |
| 2 | S2-01 … S2-46 | 46 | `MDOS/slice2/...` |
| 3 | S3-01 … S3-50 | 50 | `MDOS/slice3/...` |
| 4 | S4-01 … S4-62 | 62 | `MDOS/slice4/...` |
| 5 | S5-01 … S5-60 | 60 | `MDOS/slice5/...` |
| 6 | S6-00BUILD … S6-16BUILD | 17 | `MDOS/slice6/...` |
| 7 | S7-00BUILD … S7-16BUILD | 17 | `MDOS/slice7/...` |
| 8 | S8-00BUILD … S8-16BUILD | 17 | `MDOS/slice8/...` |
| 9 | S9-00BUILD … S9-16BUILD | 17 | `MDOS/slice9/...` |
| 10 | S10-00BUILD … S10-17BUILD | 18 | `MDOS/slice10/...` |
| 11 | S11-00BUILD … S11-17BUILD | 18 | `MDOS/slice11/...` |
| 12 | S12-00BUILD … S12-17BUILD | 18 | `MDOS/slice12/...` |
| **Event OS slices** | | **379** | |

### Event OS reconciliation OS-R00–OS-R12

| Prompt Control ID | Native ID | Title |
|-------------------|-----------|-------|
| MD-PR-0666 | OS-R00 | Reconciliation preflight and repository truth |
| MD-PR-0667 | OS-R01 | Doctrine registry, provenance and coverage engine |
| MD-PR-0668 | OS-R02 | Event scope and governed cross-event capability |
| MD-PR-0669 | OS-R03 | Executable knowledge and human-judgment boundaries |
| MD-PR-0670 | OS-R04 | Protocol and cultural authority registers |
| MD-PR-0671 | OS-R05 | Privacy, biometrics, retention and staffing policy gates |
| MD-PR-0672 | OS-R06 | Operational standards planning and evidence UX |
| MD-PR-0673 | OS-R07 | Explainable intelligence, alerts and workload controls |
| MD-PR-0674 | OS-R08 | Governed AI shadow mode and production lock |
| MD-PR-0675 | OS-R09 | Academy readiness and deployment integration |
| MD-PR-0676 | OS-R10 | Doctrine change propagation and active-event protection |
| MD-PR-0677 | OS-R11 | Operational validation harness and evidence ledger |
| MD-PR-0678 | OS-R12 | Independent-acceptance readiness and CEO release lock |

### Academy Gate 0 + Slices 01–16

Each pack contains 12 sequential execution prompts. Native IDs located for positions 01–08 only.

| Pack | Native IDs located | Positional 09–12 | Prompt Control ID range |
|------|--------------------|------------------|-------------------------|
| `ACADEMY_G0` | 01–08 | bodies present, no native ID | MD-PR-0414 … MD-PR-0425 |
| `ACADEMY_S01` | 01–08 | bodies present, no native ID | MD-PR-0426 … MD-PR-0437 |
| `ACADEMY_S02` | 01–08 | bodies present, no native ID | MD-PR-0438 … MD-PR-0449 |
| `ACADEMY_S03` | 01–08 | bodies present, no native ID | MD-PR-0450 … MD-PR-0461 |
| `ACADEMY_S04` | 01–08 | bodies present, no native ID | MD-PR-0462 … MD-PR-0473 |
| `ACADEMY_S05` | 01–08 | bodies present, no native ID | MD-PR-0474 … MD-PR-0485 |
| `ACADEMY_S06` | 01–08 | bodies present, no native ID | MD-PR-0486 … MD-PR-0497 |
| `ACADEMY_S07` | 01–08 | bodies present, no native ID | MD-PR-0498 … MD-PR-0509 |
| `ACADEMY_S08` | 01–08 | bodies present, no native ID | MD-PR-0510 … MD-PR-0521 |
| `ACADEMY_S09` | 01–08 | bodies present, no native ID | MD-PR-0522 … MD-PR-0533 |
| `ACADEMY_S10` | 01–08 | bodies present, no native ID | MD-PR-0534 … MD-PR-0545 |
| `ACADEMY_S11` | 01–08 | bodies present, no native ID | MD-PR-0546 … MD-PR-0557 |
| `ACADEMY_S12` | 01–08 | bodies present, no native ID | MD-PR-0558 … MD-PR-0569 |
| `ACADEMY_S13` | 01–08 | bodies present, no native ID | MD-PR-0570 … MD-PR-0581 |
| `ACADEMY_S14` | 01–08 | bodies present, no native ID | MD-PR-0582 … MD-PR-0593 |
| `ACADEMY_S15` | 01–08 | bodies present, no native ID | MD-PR-0594 … MD-PR-0605 |
| `ACADEMY_S16` | 01–08 | bodies present, no native ID | MD-PR-0606 … MD-PR-0617 |

### Academy reconciliation AC-R00–AC-R13

| Prompt Control ID | Native ID | Title |
|-------------------|-----------|-------|
| MD-PR-0679 | AC-R00 | Reconciliation preflight and Academy baseline |
| MD-PR-0680 | AC-R01 | Doctrine registry and learning traceability |
| MD-PR-0681 | AC-R02 | Competency and curriculum reconciliation |
| MD-PR-0682 | AC-R03 | Course-production workflow and editorial frontend |
| MD-PR-0683 | AC-R04 | Canonical lesson-corpus production programme |
| MD-PR-0684 | AC-R05 | High-difficulty question and scenario bank |
| MD-PR-0685 | AC-R06 | Practical assessment and assessor calibration |
| MD-PR-0686 | AC-R07 | Role paths, horizontal/vertical moves and re-enrolment |
| MD-PR-0687 | AC-R08 | Certification, renewal and operational authorisation |
| MD-PR-0688 | AC-R09 | Event-specific training and briefing integration |
| MD-PR-0689 | AC-R10 | Doctrine/content change propagation and reassessment |
| MD-PR-0690 | AC-R11 | Training intelligence and event staffing risk |
| MD-PR-0691 | AC-R12 | Security, privacy and assessment-integrity reconciliation |
| MD-PR-0692 | AC-R13 | Independent-acceptance readiness and CEO release lock |

### Marketing OS M0A–M11D

48 lettered execution units. Phase IDs M0–M11 are groupings only.

| Prompt Control ID | Native ID | Title |
|-------------------|-----------|-------|
| MD-PR-0618 | M0A | M0A — Repository Constitution, Discovery and Verified Decisions / Domain, shared contracts and API foundation |
| MD-PR-0619 | M0B | M0B — Repository Constitution, Discovery and Verified Decisions / Frontend, decision experience and accessibility |
| MD-PR-0620 | M0C | M0C — Repository Constitution, Discovery and Verified Decisions / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0621 | M0D | M0D — Repository Constitution, Discovery and Verified Decisions / Verification, operations and phase release |
| MD-PR-0622 | M1A | M1A — Business Diagnosis and Commercial Foundation / Domain, shared contracts and API foundation |
| MD-PR-0623 | M1B | M1B — Business Diagnosis and Commercial Foundation / Frontend, decision experience and accessibility |
| MD-PR-0624 | M1C | M1C — Business Diagnosis and Commercial Foundation / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0625 | M1D | M1D — Business Diagnosis and Commercial Foundation / Verification, operations and phase release |
| MD-PR-0626 | M2A | M2A — Doctrine, Knowledge, Evidence and Novice Guidance / Domain, shared contracts and API foundation |
| MD-PR-0627 | M2B | M2B — Doctrine, Knowledge, Evidence and Novice Guidance / Frontend, decision experience and accessibility |
| MD-PR-0628 | M2C | M2C — Doctrine, Knowledge, Evidence and Novice Guidance / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0629 | M2D | M2D — Doctrine, Knowledge, Evidence and Novice Guidance / Verification, operations and phase release |
| MD-PR-0630 | M3A | M3A — Strategy, Scenarios, Campaigns and Command Centre / Domain, shared contracts and API foundation |
| MD-PR-0631 | M3B | M3B — Strategy, Scenarios, Campaigns and Command Centre / Frontend, decision experience and accessibility |
| MD-PR-0632 | M3C | M3C — Strategy, Scenarios, Campaigns and Command Centre / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0633 | M3D | M3D — Strategy, Scenarios, Campaigns and Command Centre / Verification, operations and phase release |
| MD-PR-0634 | M4A | M4A — Content, Brand, SEO, Website and Assets / Domain, shared contracts and API foundation |
| MD-PR-0635 | M4B | M4B — Content, Brand, SEO, Website and Assets / Frontend, decision experience and accessibility |
| MD-PR-0636 | M4C | M4C — Content, Brand, SEO, Website and Assets / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0637 | M4D | M4D — Content, Brand, SEO, Website and Assets / Verification, operations and phase release |
| MD-PR-0638 | M5A | M5A — Consent, Identity, Pipeline and Lifecycle / Domain, shared contracts and API foundation |
| MD-PR-0639 | M5B | M5B — Consent, Identity, Pipeline and Lifecycle / Frontend, decision experience and accessibility |
| MD-PR-0640 | M5C | M5C — Consent, Identity, Pipeline and Lifecycle / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0641 | M5D | M5D — Consent, Identity, Pipeline and Lifecycle / Verification, operations and phase release |
| MD-PR-0642 | M6A | M6A — Social Operations, Reviews and Reputation / Domain, shared contracts and API foundation |
| MD-PR-0643 | M6B | M6B — Social Operations, Reviews and Reputation / Frontend, decision experience and accessibility |
| MD-PR-0644 | M6C | M6C — Social Operations, Reviews and Reputation / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0645 | M6D | M6D — Social Operations, Reviews and Reputation / Verification, operations and phase release |
| MD-PR-0646 | M7A | M7A — Measurement, Attribution, Experiments and Executive Intelligence / Domain, shared contracts and API foundation |
| MD-PR-0647 | M7B | M7B — Measurement, Attribution, Experiments and Executive Intelligence / Frontend, decision experience and accessibility |
| MD-PR-0648 | M7C | M7C — Measurement, Attribution, Experiments and Executive Intelligence / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0649 | M7D | M7D — Measurement, Attribution, Experiments and Executive Intelligence / Verification, operations and phase release |
| MD-PR-0650 | M8A | M8A — Paid Media, Landing Pages and Conversion / Domain, shared contracts and API foundation |
| MD-PR-0651 | M8B | M8B — Paid Media, Landing Pages and Conversion / Frontend, decision experience and accessibility |
| MD-PR-0652 | M8C | M8C — Paid Media, Landing Pages and Conversion / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0653 | M8D | M8D — Paid Media, Landing Pages and Conversion / Verification, operations and phase release |
| MD-PR-0654 | M9A | M9A — Events-as-Marketing, PR, Partners, Creators and Advocacy / Domain, shared contracts and API foundation |
| MD-PR-0655 | M9B | M9B — Events-as-Marketing, PR, Partners, Creators and Advocacy / Frontend, decision experience and accessibility |
| MD-PR-0656 | M9C | M9C — Events-as-Marketing, PR, Partners, Creators and Advocacy / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0657 | M9D | M9D — Events-as-Marketing, PR, Partners, Creators and Advocacy / Verification, operations and phase release |
| MD-PR-0658 | M10A | M10A — Estate Integration: Event OS, Academy and Finance/Control / Domain, shared contracts and API foundation |
| MD-PR-0659 | M10B | M10B — Estate Integration: Event OS, Academy and Finance/Control / Frontend, decision experience and accessibility |
| MD-PR-0660 | M10C | M10C — Estate Integration: Event OS, Academy and Finance/Control / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0661 | M10D | M10D — Estate Integration: Event OS, Academy and Finance/Control / Verification, operations and phase release |
| MD-PR-0662 | M11A | M11A — AI Evaluation, Bounded Autonomy and Production Certification / Domain, shared contracts and API foundation |
| MD-PR-0663 | M11B | M11B — AI Evaluation, Bounded Autonomy and Production Certification / Frontend, decision experience and accessibility |
| MD-PR-0664 | M11C | M11C — AI Evaluation, Bounded Autonomy and Production Certification / Durable workflows, integrations and AI/provider boundary |
| MD-PR-0665 | M11D | M11D — AI Evaluation, Bounded Autonomy and Production Certification / Verification, operations and phase release |

### Premium Ushering

| Prompt Control ID | Native ID | Title |
|-------------------|-----------|-------|
| MD-PR-0693 | MD-USH-ACA-010 | Academy Premium Ushering Cursor Reconciliation Prompt (single authorised prompt) |

## Complete Prompt Control ID index

| Prompt Control ID | Native ID | Product | Family | Title | Source path | Status | Confidence | Claude flag |
|-------------------|-----------|---------|--------|-------|-------------|--------|------------|-------------|
| MD-PR-0001 | CT0 | FOUNDATION | CONTROL_TOWER_CT | Preflight and Claude-plan adoption | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0002 | CT1 | FOUNDATION | CONTROL_TOWER_CT | Programme domain and manifest validator | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0003 | CT2 | FOUNDATION | CONTROL_TOWER_CT | Persistence, snapshots and status calculator | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0004 | CT3 | FOUNDATION | CONTROL_TOWER_CT | Repository and CI ingestion | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0005 | CT4 | FOUNDATION | CONTROL_TOWER_CT | Control Tower shell and executive portfolio | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0006 | CT5 | FOUNDATION | CONTROL_TOWER_CT | Roadmap, product and slice drill-down | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0007 | CT6 | FOUNDATION | CONTROL_TOWER_CT | Open items, decisions, gates, releases and audit | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0008 | CT7 | FOUNDATION | CONTROL_TOWER_CT | RAG ingestion and grounded programme assistant | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0009 | CT8 | FOUNDATION | CONTROL_TOWER_CT | Charts, notifications and update freshness | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0010 | CT9 | FOUNDATION | CONTROL_TOWER_CT | Operations, full acceptance and release evidence | `claude handover/roadmap_control_tower_addendum/repository-specifications/Maison_Doclar_Control_Tower_TypeScript_Cursor_Prompt_Programme_CT0-CT9_v1.0_DRAFT.md` | NOT_EXECUTED | high | YES |
| MD-PR-0011 | R0 | EVENT_DAY | EVENT_DAY_R | Repository preflight and supersession | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0012 | R1 | EVENT_DAY | EVENT_DAY_R | Domain kernel and runtime state machine | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0013 | R2 | EVENT_DAY | EVENT_DAY_R | Departmental projection registry | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0014 | R3 | EVENT_DAY | EVENT_DAY_R | Package builder and minimisation | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0015 | R4 | EVENT_DAY | EVENT_DAY_R | Package freeze, manifest, signature and import | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0016 | R5 | EVENT_DAY | EVENT_DAY_R | Local persistence and immutable ledger | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0017 | R6 | EVENT_DAY | EVENT_DAY_R | Local identity, device registry and certificate enrolment | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0018 | R7 | EVENT_DAY | EVENT_DAY_R | PWA shell and pinned local assets | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0019 | R8 | EVENT_DAY | EVENT_DAY_R | Scan and lookup platform | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0020 | R9 | EVENT_DAY | EVENT_DAY_R | Initial human check-in surface | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0021 | R10 | EVENT_DAY | EVENT_DAY_R | Greeter, protocol and guest-relations surfaces | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0022 | R11 | EVENT_DAY | EVENT_DAY_R | Seating, ushering and guest service surfaces | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0023 | R12 | EVENT_DAY | EVENT_DAY_R | Department lead workspaces | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0024 | R13 | EVENT_DAY | EVENT_DAY_R | Self-scan kiosk | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0025 | R14 | EVENT_DAY | EVENT_DAY_R | Client emergency outbox | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0026 | R15 | EVENT_DAY | EVENT_DAY_R | FaceGate consented enrolment and return-only gateway | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0027 | R16 | EVENT_DAY | EVENT_DAY_R | Command console, health and degradation | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0028 | R17 | EVENT_DAY | EVENT_DAY_R | Staff deployment, shifts and Academy gates | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0029 | R18 | EVENT_DAY | EVENT_DAY_R | Incidents, safety, service recovery and fallback | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0030 | R19 | EVENT_DAY | EVENT_DAY_R | Close, drain, seal and encrypted export | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0031 | R20 | EVENT_DAY | EVENT_DAY_R | Deterministic cloud reconciliation | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0032 | R21 | EVENT_DAY | EVENT_DAY_R | Deployment, configuration, backup and recovery | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0033 | R22 | EVENT_DAY | EVENT_DAY_R | Full automated and browser acceptance | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0034 | R23 | EVENT_DAY | EVENT_DAY_R | Evidence pack and release locks | `event_day_runtime_complete_v2/repository-specifications/Maison_Doclar_TypeScript_Rich_Cursor_Event_Day_Runtime_Programme_R0-R23_v2.0_DRAFT.md` | NOT_EXECUTED | high | NO |
| MD-PR-0035 | S1-01 | EVENT_OS | EVENT_OS_S1 | Repository constitution and decisions | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0036 | S1-02 | EVENT_OS | EVENT_OS_S1 | Monorepo scaffold | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0037 | S1-03 | EVENT_OS | EVENT_OS_S1 | Local quality toolchain | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0038 | S1-04 | EVENT_OS | EVENT_OS_S1 | Continuous integration and failure proof | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0039 | S1-05 | EVENT_OS | EVENT_OS_S1 | Foundation contracts and Prisma schema | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0040 | S1-06 | EVENT_OS | EVENT_OS_S1 | Migrations and scoped repositories | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0041 | S1-07 | EVENT_OS | EVENT_OS_S1 | Database factories and isolation tests | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0042 | S1-08 | EVENT_OS | EVENT_OS_S1 | Identity contracts, User model and session design | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0043 | S1-09 | EVENT_OS | EVENT_OS_S1 | OIDC flow and protected request resolution | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0044 | S1-10 | EVENT_OS | EVENT_OS_S1 | Authentication screens and browser tests | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0045 | S1-11 | EVENT_OS | EVENT_OS_S1 | Permission catalogue and pure policy evaluator | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0046 | S1-12 | EVENT_OS | EVENT_OS_S1 | Enforcement at route, action and repository boundaries | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0047 | S1-13 | EVENT_OS | EVENT_OS_S1 | Assignment lifecycle services | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0048 | S1-14 | EVENT_OS | EVENT_OS_S1 | Audit model, contract and redaction | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0049 | S1-15 | EVENT_OS | EVENT_OS_S1 | Atomic mutation and denial auditing | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0050 | S1-16 | EVENT_OS | EVENT_OS_S1 | Audit query and export contracts | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0051 | S1-17 | EVENT_OS | EVENT_OS_S1 | Tokens and component documentation harness | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0052 | S1-18 | EVENT_OS | EVENT_OS_S1 | Accessible primitives and form controls | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0053 | S1-19 | EVENT_OS | EVENT_OS_S1 | Navigation, status and data components | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0054 | S1-20 | EVENT_OS | EVENT_OS_S1 | Design-system acceptance | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0055 | S1-21 | EVENT_OS | EVENT_OS_S1 | Protected shell and navigation | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0056 | S1-22 | EVENT_OS | EVENT_OS_S1 | Event context and switch isolation | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0057 | S1-23 | EVENT_OS | EVENT_OS_S1 | Home and global state completion | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0058 | S1-24 | EVENT_OS | EVENT_OS_S1 | Client contracts, APIs and services | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0059 | S1-25 | EVENT_OS | EVENT_OS_S1 | Client list and overview | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0060 | S1-26 | EVENT_OS | EVENT_OS_S1 | Client create/edit/archive interaction | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0061 | S1-27 | EVENT_OS | EVENT_OS_S1 | Client end-to-end acceptance | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0062 | S1-28 | EVENT_OS | EVENT_OS_S1 | Event contracts, lifecycle services and APIs | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0063 | S1-29 | EVENT_OS | EVENT_OS_S1 | Event list and creation | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0064 | S1-30 | EVENT_OS | EVENT_OS_S1 | Event overview, settings and phase history | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0065 | S1-31 | EVENT_OS | EVENT_OS_S1 | Event end-to-end acceptance | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0066 | S1-32 | EVENT_OS | EVENT_OS_S1 | Access administration UI | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0067 | S1-33 | EVENT_OS | EVENT_OS_S1 | Audit viewer and controlled export | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0068 | S1-34 | EVENT_OS | EVENT_OS_S1 | My Work and system health | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0069 | S1-35 | EVENT_OS | EVENT_OS_S1 | Administration end-to-end acceptance | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0070 | S1-36 | EVENT_OS | EVENT_OS_S1 | Local clean-room acceptance | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0071 | S1-37 | EVENT_OS | EVENT_OS_S1 | Railway staging deployment and rollback | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0072 | S1-38 | EVENT_OS | EVENT_OS_S1 | Independent security, accessibility and architecture audit | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0073 | S1-39 | EVENT_OS | EVENT_OS_S1 | Handover, release record and acceptance dossier | `MDOS/slice1/Maison_Doclar_Slice_1_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0074 | S2-01 | EVENT_OS | EVENT_OS_S2 | Verify Slice 1 entry gate | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0075 | S2-02 | EVENT_OS | EVENT_OS_S2 | Ratify identity, matching and retention decisions | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0076 | S2-03 | EVENT_OS | EVENT_OS_S2 | Slice 2 architecture and traceability ledger | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0077 | S2-04 | EVENT_OS | EVENT_OS_S2 | Intake domain contracts and enums | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0078 | S2-05 | EVENT_OS | EVENT_OS_S2 | Policy, batch, file and mapping schema | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0079 | S2-06 | EVENT_OS | EVENT_OS_S2 | Raw, working, issue and candidate schema | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0080 | S2-07 | EVENT_OS | EVENT_OS_S2 | Scoped quarantine repositories and migration acceptance | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0081 | S2-08 | EVENT_OS | EVENT_OS_S2 | Private object storage and malware boundary | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0082 | S2-09 | EVENT_OS | EVENT_OS_S2 | Upload and finalisation service | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0083 | S2-10 | EVENT_OS | EVENT_OS_S2 | CSV parser and immutable raw ingestion | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0084 | S2-11 | EVENT_OS | EVENT_OS_S2 | XLSX parser and durable job recovery | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0085 | S2-12 | EVENT_OS | EVENT_OS_S2 | Mapping-version service | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0086 | S2-13 | EVENT_OS | EVENT_OS_S2 | International normalisation library | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0087 | S2-14 | EVENT_OS | EVENT_OS_S2 | Validation, issues and deterministic reprocessing | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0088 | S2-15 | EVENT_OS | EVENT_OS_S2 | Mapping and validation scale/security acceptance | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0089 | S2-16 | EVENT_OS | EVENT_OS_S2 | EventGuest, contacts and requirements schema | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0090 | S2-17 | EVENT_OS | EVENT_OS_S2 | Household and relationship schema/services | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0091 | S2-18 | EVENT_OS | EVENT_OS_S2 | Scoped guest repositories and sensitive projections | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0092 | S2-19 | EVENT_OS | EVENT_OS_S2 | Guest-core integration and security tests | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0093 | S2-20 | EVENT_OS | EVENT_OS_S2 | Match contracts, proposals and policy | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0094 | S2-21 | EVENT_OS | EVENT_OS_S2 | Exact within-event conflict detection | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0095 | S2-22 | EVENT_OS | EVENT_OS_S2 | Fuzzy suggestion engine | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0096 | S2-23 | EVENT_OS | EVENT_OS_S2 | Governed PersonProfile link and reversal | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0097 | S2-24 | EVENT_OS | EVENT_OS_S2 | Candidate review decisions | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0098 | S2-25 | EVENT_OS | EVENT_OS_S2 | Atomic idempotent promotion | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0099 | S2-26 | EVENT_OS | EVENT_OS_S2 | Correction and reversible decisions | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0100 | S2-27 | EVENT_OS | EVENT_OS_S2 | Batch rollback and promotion load acceptance | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0101 | S2-28 | EVENT_OS | EVENT_OS_S2 | Event navigation and intake overview | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0102 | S2-29 | EVENT_OS | EVENT_OS_S2 | New import and secure upload UI | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0103 | S2-30 | EVENT_OS | EVENT_OS_S2 | Batch shell, stage navigation and progress | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0104 | S2-31 | EVENT_OS | EVENT_OS_S2 | Intake frontend foundation acceptance | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0105 | S2-32 | EVENT_OS | EVENT_OS_S2 | Worksheet and header selection UI | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0106 | S2-33 | EVENT_OS | EVENT_OS_S2 | Column mapping and transform preview | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0107 | S2-34 | EVENT_OS | EVENT_OS_S2 | Validation queue and working corrections | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0108 | S2-35 | EVENT_OS | EVENT_OS_S2 | Duplicate, candidate and promotion workspaces | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0109 | S2-36 | EVENT_OS | EVENT_OS_S2 | Guest directory and detail | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0110 | S2-37 | EVENT_OS | EVENT_OS_S2 | Manual guest intake | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0111 | S2-38 | EVENT_OS | EVENT_OS_S2 | Household and identity review UI | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0112 | S2-39 | EVENT_OS | EVENT_OS_S2 | Correction, reversal, settings and history UI | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0113 | S2-40 | EVENT_OS | EVENT_OS_S2 | Deterministic intake intelligence and alerts | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0114 | S2-41 | EVENT_OS | EVENT_OS_S2 | Retention sweep and operational health | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0115 | S2-42 | EVENT_OS | EVENT_OS_S2 | Worker failure, scale and staging integration | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0116 | S2-43 | EVENT_OS | EVENT_OS_S2 | Clean-room full acceptance | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0117 | S2-44 | EVENT_OS | EVENT_OS_S2 | Staging deployment and rollback | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0118 | S2-45 | EVENT_OS | EVENT_OS_S2 | Independent architecture, privacy and UX audit | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0119 | S2-46 | EVENT_OS | EVENT_OS_S2 | Handover and CEO acceptance dossier | `MDOS/slice2/Maison_Doclar_Slice_2_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0120 | S3-01 | EVENT_OS | EVENT_OS_S3 | Verify Slice 2 entry gate | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0121 | S3-02 | EVENT_OS | EVENT_OS_S3 | Ratify RSVP decisions and operating policy | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0122 | S3-03 | EVENT_OS | EVENT_OS_S3 | Slice 3 architecture and traceability ledger | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0123 | S3-04 | EVENT_OS | EVENT_OS_S3 | RSVP identifiers, enums, errors and events | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0124 | S3-05 | EVENT_OS | EVENT_OS_S3 | RSVP policy and privacy configuration schema | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0125 | S3-06 | EVENT_OS | EVENT_OS_S3 | Questionnaire, section and question version schema | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0126 | S3-07 | EVENT_OS | EVENT_OS_S3 | Invitation, token and session schema | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0127 | S3-08 | EVENT_OS | EVENT_OS_S3 | Entitlement, response and projection schema | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0128 | S3-09 | EVENT_OS | EVENT_OS_S3 | Exception, assistance and audit schema | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0129 | S3-10 | EVENT_OS | EVENT_OS_S3 | Scoped repositories and persistence acceptance | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0130 | S3-11 | EVENT_OS | EVENT_OS_S3 | Token cryptography and key-ring contract | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0131 | S3-12 | EVENT_OS | EVENT_OS_S3 | Invitation issue, rotate, revoke and expire services | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0132 | S3-13 | EVENT_OS | EVENT_OS_S3 | Guest token exchange and narrow session | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0133 | S3-14 | EVENT_OS | EVENT_OS_S3 | Session recovery, abuse controls and logout | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0134 | S3-15 | EVENT_OS | EVENT_OS_S3 | Signed-link security acceptance and runbook | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0135 | S3-16 | EVENT_OS | EVENT_OS_S3 | Questionnaire draft service | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0136 | S3-17 | EVENT_OS | EVENT_OS_S3 | Branching and validation compiler | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0137 | S3-18 | EVENT_OS | EVENT_OS_S3 | Publish, close and archive form versions | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0138 | S3-19 | EVENT_OS | EVENT_OS_S3 | Response session and autosave service | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0139 | S3-20 | EVENT_OS | EVENT_OS_S3 | Final submission and immutable receipt | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0140 | S3-21 | EVENT_OS | EVENT_OS_S3 | Attendance intent rules and projection engine | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0141 | S3-22 | EVENT_OS | EVENT_OS_S3 | Companion and entitlement service | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0142 | S3-23 | EVENT_OS | EVENT_OS_S3 | Household respondent authority service | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0143 | S3-24 | EVENT_OS | EVENT_OS_S3 | Headcount exception workflow | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0144 | S3-25 | EVENT_OS | EVENT_OS_S3 | Projection reconciliation and scale acceptance | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0145 | S3-26 | EVENT_OS | EVENT_OS_S3 | Sensitive answer and consent policy | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0146 | S3-27 | EVENT_OS | EVENT_OS_S3 | Assistance request workflow | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0147 | S3-28 | EVENT_OS | EVENT_OS_S3 | Guest amendment service | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0148 | S3-29 | EVENT_OS | EVENT_OS_S3 | Staff correction and withdrawal service | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0149 | S3-30 | EVENT_OS | EVENT_OS_S3 | Retention, closure and correction acceptance | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0150 | S3-31 | EVENT_OS | EVENT_OS_S3 | Guest access, welcome and unavailable states | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0151 | S3-32 | EVENT_OS | EVENT_OS_S3 | Versioned RSVP step renderer | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0152 | S3-33 | EVENT_OS | EVENT_OS_S3 | Attendance and household response UI | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0153 | S3-34 | EVENT_OS | EVENT_OS_S3 | Companion and entitlement UI | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0154 | S3-35 | EVENT_OS | EVENT_OS_S3 | Needs, privacy and assistance UI | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0155 | S3-36 | EVENT_OS | EVENT_OS_S3 | Review, submit and confirmation UI | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0156 | S3-37 | EVENT_OS | EVENT_OS_S3 | Amendment and assistance status UI | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0157 | S3-38 | EVENT_OS | EVENT_OS_S3 | Guest frontend whole-journey acceptance | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0158 | S3-39 | EVENT_OS | EVENT_OS_S3 | RSVP staff overview | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0159 | S3-40 | EVENT_OS | EVENT_OS_S3 | RSVP policy and form builder UI | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0160 | S3-41 | EVENT_OS | EVENT_OS_S3 | Invitation and entitlement workspace | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0161 | S3-42 | EVENT_OS | EVENT_OS_S3 | Response directory and history UI | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0162 | S3-43 | EVENT_OS | EVENT_OS_S3 | Exception and assistance queues | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0163 | S3-44 | EVENT_OS | EVENT_OS_S3 | Deterministic alerts and operational views | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0164 | S3-45 | EVENT_OS | EVENT_OS_S3 | Staff frontend whole-surface acceptance | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0165 | S3-46 | EVENT_OS | EVENT_OS_S3 | Workers, observability and operational recovery | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0166 | S3-47 | EVENT_OS | EVENT_OS_S3 | Integrated security, privacy, load and resilience acceptance | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0167 | S3-48 | EVENT_OS | EVENT_OS_S3 | Clean-room whole-slice acceptance | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0168 | S3-49 | EVENT_OS | EVENT_OS_S3 | Staging deployment, rollback and independent audit | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0169 | S3-50 | EVENT_OS | EVENT_OS_S3 | Handover and CEO acceptance dossier | `MDOS/slice3/Maison_Doclar_Slice_3_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0170 | S4-01 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-01 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0171 | S4-02 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-02 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0172 | S4-03 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-03 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0173 | S4-04 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-04 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0174 | S4-05 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-05 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0175 | S4-06 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-06 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0176 | S4-07 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-07 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0177 | S4-08 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-08 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0178 | S4-09 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-09 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0179 | S4-10 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-10 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0180 | S4-11 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-11 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0181 | S4-12 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-12 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0182 | S4-13 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-13 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0183 | S4-14 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-14 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0184 | S4-15 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-15 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0185 | S4-16 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-16 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0186 | S4-17 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-17 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0187 | S4-18 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-18 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0188 | S4-19 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-19 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0189 | S4-20 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-20 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0190 | S4-21 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-21 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0191 | S4-22 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-22 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0192 | S4-23 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-23 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0193 | S4-24 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-24 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0194 | S4-25 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-25 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0195 | S4-26 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-26 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0196 | S4-27 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-27 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0197 | S4-28 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-28 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0198 | S4-29 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-29 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0199 | S4-30 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-30 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0200 | S4-31 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-31 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0201 | S4-32 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-32 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0202 | S4-33 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-33 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0203 | S4-34 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-34 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0204 | S4-35 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-35 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0205 | S4-36 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-36 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0206 | S4-37 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-37 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0207 | S4-38 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-38 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0208 | S4-39 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-39 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0209 | S4-40 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-40 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0210 | S4-41 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-41 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0211 | S4-42 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-42 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0212 | S4-43 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-43 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0213 | S4-44 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-44 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0214 | S4-45 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-45 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0215 | S4-46 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-46 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0216 | S4-47 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-47 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0217 | S4-48 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-48 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0218 | S4-49 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-49 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0219 | S4-50 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-50 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0220 | S4-51 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-51 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0221 | S4-52 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-52 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0222 | S4-53 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-53 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0223 | S4-54 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-54 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0224 | S4-55 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-55 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0225 | S4-56 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-56 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0226 | S4-57 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-57 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0227 | S4-58 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-58 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0228 | S4-59 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-59 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0229 | S4-60 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-60 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0230 | S4-61 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-61 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0231 | S4-62 | EVENT_OS | EVENT_OS_S4 | Event OS Slice 4 prompt S4-62 | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0232 | S5-01 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-01 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0233 | S5-02 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-02 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0234 | S5-03 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-03 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0235 | S5-04 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-04 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0236 | S5-05 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-05 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0237 | S5-06 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-06 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0238 | S5-07 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-07 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0239 | S5-08 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-08 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0240 | S5-09 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-09 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0241 | S5-10 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-10 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0242 | S5-11 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-11 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0243 | S5-12 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-12 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0244 | S5-13 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-13 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0245 | S5-14 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-14 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0246 | S5-15 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-15 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0247 | S5-16 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-16 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0248 | S5-17 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-17 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0249 | S5-18 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-18 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0250 | S5-19 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-19 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0251 | S5-20 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-20 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0252 | S5-21 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-21 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0253 | S5-22 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-22 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0254 | S5-23 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-23 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0255 | S5-24 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-24 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0256 | S5-25 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-25 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0257 | S5-26 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-26 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0258 | S5-27 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-27 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0259 | S5-28 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-28 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0260 | S5-29 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-29 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0261 | S5-30 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-30 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0262 | S5-31 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-31 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0263 | S5-32 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-32 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0264 | S5-33 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-33 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0265 | S5-34 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-34 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0266 | S5-35 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-35 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0267 | S5-36 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-36 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0268 | S5-37 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-37 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0269 | S5-38 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-38 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0270 | S5-39 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-39 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0271 | S5-40 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-40 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0272 | S5-41 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-41 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0273 | S5-42 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-42 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0274 | S5-43 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-43 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0275 | S5-44 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-44 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0276 | S5-45 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-45 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0277 | S5-46 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-46 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0278 | S5-47 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-47 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0279 | S5-48 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-48 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0280 | S5-49 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-49 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0281 | S5-50 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-50 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0282 | S5-51 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-51 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0283 | S5-52 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-52 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0284 | S5-53 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-53 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0285 | S5-54 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-54 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0286 | S5-55 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-55 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0287 | S5-56 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-56 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0288 | S5-57 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-57 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0289 | S5-58 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-58 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0290 | S5-59 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-59 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0291 | S5-60 | EVENT_OS | EVENT_OS_S5 | Event OS Slice 5 prompt S5-60 | `MDOS/slice5/Maison_Doclar_Slice_5_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0292 | S6-00BUILD | EVENT_OS | EVENT_OS_S6 | Event OS Slice 6 prompt S6-00BUILD | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0293 | S6-01BUILD | EVENT_OS | EVENT_OS_S6 | entry audit, ADR, boundaries, traceability and feature flag | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0294 | S6-02BUILD | EVENT_OS | EVENT_OS_S6 | persistence model | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0295 | S6-03BUILD | EVENT_OS | EVENT_OS_S6 | input reads, tokenisation and readiness | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0296 | S6-04BUILD | EVENT_OS | EVENT_OS_S6 | hard/weighted rules and permissions | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0297 | S6-05BUILD | EVENT_OS | EVENT_OS_S6 | reservations | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0298 | S6-06BUILD | EVENT_OS | EVENT_OS_S6 | solver gateway, queue and deterministic engine | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0299 | S6-07BUILD | EVENT_OS | EVENT_OS_S6 | allocation quality and impossible cases | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0300 | S6-08BUILD | EVENT_OS | EVENT_OS_S6 | first complete frontend journey | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0301 | S6-09BUILD | EVENT_OS | EVENT_OS_S6 | run analysis frontend | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0302 | S6-10BUILD | EVENT_OS | EVENT_OS_S6 | move, swap, unseat, lock, undo/redo | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0303 | S6-11BUILD | EVENT_OS | EVENT_OS_S6 | canvas, queue, inspectors and accessible equivalents | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0304 | S6-12BUILD | EVENT_OS | EVENT_OS_S6 | actionable intelligence and staleness | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0305 | S6-13BUILD | EVENT_OS | EVENT_OS_S6 | maker-checker and downstream contract | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0306 | S6-14BUILD | EVENT_OS | EVENT_OS_S6 | production qualification | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0307 | S6-15BUILD | EVENT_OS | EVENT_OS_S6 | independent evaluation and rollback | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0308 | S6-16BUILD | EVENT_OS | EVENT_OS_S6 | final technical and product audit | `MDOS/slice6/Maison_Doclar_Slice_6_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0309 | S7-00BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-00BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0310 | S7-01BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-01BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0311 | S7-02BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-02BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0312 | S7-03BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-03BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0313 | S7-04BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-04BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0314 | S7-05BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-05BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0315 | S7-06BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-06BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0316 | S7-07BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-07BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0317 | S7-08BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-08BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0318 | S7-09BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-09BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0319 | S7-10BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-10BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0320 | S7-11BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-11BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0321 | S7-12BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-12BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0322 | S7-13BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-13BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0323 | S7-14BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-14BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0324 | S7-15BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-15BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0325 | S7-16BUILD | EVENT_OS | EVENT_OS_S7 | Event OS Slice 7 prompt S7-16BUILD | `MDOS/slice7/Maison_Doclar_Slice_7_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0326 | S8-00BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-00BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0327 | S8-01BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-01BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0328 | S8-02BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-02BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0329 | S8-03BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-03BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0330 | S8-04BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-04BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0331 | S8-05BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-05BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0332 | S8-06BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-06BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0333 | S8-07BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-07BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0334 | S8-08BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-08BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0335 | S8-09BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-09BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0336 | S8-10BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-10BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0337 | S8-11BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-11BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0338 | S8-12BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-12BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0339 | S8-13BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-13BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0340 | S8-14BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-14BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0341 | S8-15BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-15BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0342 | S8-16BUILD | EVENT_OS | EVENT_OS_S8 | Event OS Slice 8 prompt S8-16BUILD | `MDOS/slice8/Maison_Doclar_Slice_8_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0343 | S9-00BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-00BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0344 | S9-01BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-01BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0345 | S9-02BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-02BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0346 | S9-03BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-03BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0347 | S9-04BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-04BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0348 | S9-05BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-05BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0349 | S9-06BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-06BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0350 | S9-07BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-07BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0351 | S9-08BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-08BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0352 | S9-09BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-09BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0353 | S9-10BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-10BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0354 | S9-11BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-11BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0355 | S9-12BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-12BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0356 | S9-13BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-13BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0357 | S9-14BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-14BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0358 | S9-15BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-15BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0359 | S9-16BUILD | EVENT_OS | EVENT_OS_S9 | Event OS Slice 9 prompt S9-16BUILD | `MDOS/slice9/Maison_Doclar_Slice_9_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0360 | S10-00BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-00BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0361 | S10-01BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-01BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0362 | S10-02BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-02BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0363 | S10-03BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-03BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0364 | S10-04BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-04BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0365 | S10-05BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-05BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0366 | S10-06BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-06BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0367 | S10-07BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-07BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0368 | S10-08BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-08BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0369 | S10-09BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-09BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0370 | S10-10BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-10BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0371 | S10-11BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-11BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0372 | S10-12BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-12BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0373 | S10-13BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-13BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0374 | S10-14BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-14BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0375 | S10-15BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-15BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0376 | S10-16BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-16BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0377 | S10-17BUILD | EVENT_OS | EVENT_OS_S10 | Event OS Slice 10 prompt S10-17BUILD | `MDOS/slice10/Maison_Doclar_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0378 | S11-00BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-00BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0379 | S11-01BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-01BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0380 | S11-02BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-02BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0381 | S11-03BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-03BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0382 | S11-04BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-04BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0383 | S11-05BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-05BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0384 | S11-06BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-06BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0385 | S11-07BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-07BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0386 | S11-08BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-08BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0387 | S11-09BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-09BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0388 | S11-10BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-10BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0389 | S11-11BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-11BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0390 | S11-12BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-12BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0391 | S11-13BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-13BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0392 | S11-14BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-14BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0393 | S11-15BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-15BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0394 | S11-16BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-16BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0395 | S11-17BUILD | EVENT_OS | EVENT_OS_S11 | Event OS Slice 11 prompt S11-17BUILD | `MDOS/slice11/Maison_Doclar_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0396 | S12-00BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-00BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0397 | S12-01BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-01BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0398 | S12-02BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-02BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0399 | S12-03BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-03BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0400 | S12-04BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-04BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0401 | S12-05BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-05BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0402 | S12-06BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-06BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0403 | S12-07BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-07BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0404 | S12-08BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-08BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0405 | S12-09BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-09BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0406 | S12-10BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-10BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0407 | S12-11BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-11BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0408 | S12-12BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-12BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0409 | S12-13BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-13BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0410 | S12-14BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-14BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0411 | S12-15BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-15BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0412 | S12-16BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-16BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0413 | S12-17BUILD | EVENT_OS | EVENT_OS_S12 | Event OS Slice 12 prompt S12-17BUILD | `MDOS/slice12/Maison_Doclar_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0414 | G0-01 | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0415 | G0-02 | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0416 | G0-03 | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0417 | G0-04 | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0418 | G0-05 | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0419 | G0-06 | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0420 | G0-07 | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0421 | G0-08 | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0422 | G0-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0423 | G0-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0424 | G0-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0425 | G0-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_G0 | Academy Gate 0 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Gate_0_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0426 | S01-01 | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0427 | S01-02 | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0428 | S01-03 | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0429 | S01-04 | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0430 | S01-05 | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0431 | S01-06 | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0432 | S01-07 | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0433 | S01-08 | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0434 | S01-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0435 | S01-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0436 | S01-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0437 | S01-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S01 | Academy Slice 01 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_01_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0438 | S02-01 | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0439 | S02-02 | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0440 | S02-03 | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0441 | S02-04 | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0442 | S02-05 | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0443 | S02-06 | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0444 | S02-07 | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0445 | S02-08 | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0446 | S02-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0447 | S02-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0448 | S02-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0449 | S02-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S02 | Academy Slice 02 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_02_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0450 | S03-01 | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0451 | S03-02 | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0452 | S03-03 | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0453 | S03-04 | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0454 | S03-05 | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0455 | S03-06 | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0456 | S03-07 | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0457 | S03-08 | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0458 | S03-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0459 | S03-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0460 | S03-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0461 | S03-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S03 | Academy Slice 03 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_03_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0462 | S04-01 | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0463 | S04-02 | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0464 | S04-03 | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0465 | S04-04 | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0466 | S04-05 | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0467 | S04-06 | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0468 | S04-07 | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0469 | S04-08 | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0470 | S04-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0471 | S04-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0472 | S04-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0473 | S04-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S04 | Academy Slice 04 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_04_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0474 | S05-01 | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0475 | S05-02 | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0476 | S05-03 | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0477 | S05-04 | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0478 | S05-05 | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0479 | S05-06 | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0480 | S05-07 | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0481 | S05-08 | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0482 | S05-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0483 | S05-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0484 | S05-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0485 | S05-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S05 | Academy Slice 05 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_05_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0486 | S06-01 | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0487 | S06-02 | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0488 | S06-03 | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0489 | S06-04 | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0490 | S06-05 | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0491 | S06-06 | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0492 | S06-07 | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0493 | S06-08 | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0494 | S06-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0495 | S06-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0496 | S06-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0497 | S06-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S06 | Academy Slice 06 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_06_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0498 | S07-01 | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0499 | S07-02 | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0500 | S07-03 | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0501 | S07-04 | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0502 | S07-05 | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0503 | S07-06 | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0504 | S07-07 | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0505 | S07-08 | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0506 | S07-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0507 | S07-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0508 | S07-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0509 | S07-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S07 | Academy Slice 07 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_07_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0510 | S08-01 | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0511 | S08-02 | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0512 | S08-03 | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0513 | S08-04 | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0514 | S08-05 | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0515 | S08-06 | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0516 | S08-07 | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0517 | S08-08 | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0518 | S08-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0519 | S08-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0520 | S08-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0521 | S08-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S08 | Academy Slice 08 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_08_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0522 | S09-01 | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0523 | S09-02 | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0524 | S09-03 | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0525 | S09-04 | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0526 | S09-05 | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0527 | S09-06 | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0528 | S09-07 | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0529 | S09-08 | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0530 | S09-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0531 | S09-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0532 | S09-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0533 | S09-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S09 | Academy Slice 09 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_09_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0534 | S10-01 | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0535 | S10-02 | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0536 | S10-03 | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0537 | S10-04 | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0538 | S10-05 | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0539 | S10-06 | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0540 | S10-07 | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0541 | S10-08 | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0542 | S10-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0543 | S10-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0544 | S10-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0545 | S10-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S10 | Academy Slice 10 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_10_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0546 | S11-01 | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0547 | S11-02 | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0548 | S11-03 | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0549 | S11-04 | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0550 | S11-05 | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0551 | S11-06 | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0552 | S11-07 | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0553 | S11-08 | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0554 | S11-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0555 | S11-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0556 | S11-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0557 | S11-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S11 | Academy Slice 11 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_11_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0558 | S12-01 | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0559 | S12-02 | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0560 | S12-03 | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0561 | S12-04 | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0562 | S12-05 | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0563 | S12-06 | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0564 | S12-07 | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0565 | S12-08 | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0566 | S12-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0567 | S12-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0568 | S12-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0569 | S12-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S12 | Academy Slice 12 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_12_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0570 | S13-01 | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0571 | S13-02 | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0572 | S13-03 | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0573 | S13-04 | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0574 | S13-05 | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0575 | S13-06 | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0576 | S13-07 | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0577 | S13-08 | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0578 | S13-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0579 | S13-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0580 | S13-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0581 | S13-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S13 | Academy Slice 13 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_13_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0582 | S14-01 | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0583 | S14-02 | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0584 | S14-03 | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0585 | S14-04 | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0586 | S14-05 | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0587 | S14-06 | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0588 | S14-07 | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0589 | S14-08 | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0590 | S14-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0591 | S14-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0592 | S14-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0593 | S14-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S14 | Academy Slice 14 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_14_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0594 | S15-01 | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0595 | S15-02 | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0596 | S15-03 | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0597 | S15-04 | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0598 | S15-05 | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0599 | S15-06 | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0600 | S15-07 | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0601 | S15-08 | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0602 | S15-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0603 | S15-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0604 | S15-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0605 | S15-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S15 | Academy Slice 15 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_15_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0606 | S16-01 | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 01 of 12: Preflight, current-state inspection and contract freeze | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0607 | S16-02 | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 02 of 12: Data model, migrations and invariants | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0608 | S16-03 | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 03 of 12: Domain and backend implementation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0609 | S16-04 | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 04 of 12: APIs, jobs and integration boundaries | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0610 | S16-05 | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 05 of 12: Frontend foundation and view contracts | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0611 | S16-06 | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 06 of 12: Complete role workflows and recovery UX | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0612 | S16-07 | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 07 of 12: Security, permissions, privacy, audit and observability | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0613 | S16-08 | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 08 of 12: Managed fixtures, seed/import and operational documentation | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0614 | S16-P09[NO_NATIVE_ID] | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 09 of 12: Unit, integration, policy and contract verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0615 | S16-P10[NO_NATIVE_ID] | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 10 of 12: Browser, responsive, accessibility and resilience verification | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0616 | S16-P11[NO_NATIVE_ID] | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 11 of 12: Independent acceptance, remediation and release evidence | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0617 | S16-P12[NO_NATIVE_ID] | ACADEMY | ACADEMY_S16 | Academy Slice 16 prompt 12 of 12: Final audit, closure and handover | `MD Academy/16-cursor slice pack/Maison_Doclar_Academy_Slice_16_Cursor_Prompt_Pack_v1.0.docx` | NOT_EXECUTED | medium | NO |
| MD-PR-0618 | M0A | MARKETING | MARKETING_M_LETTERED | M0A — Repository Constitution, Discovery and Verified Decisions / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0619 | M0B | MARKETING | MARKETING_M_LETTERED | M0B — Repository Constitution, Discovery and Verified Decisions / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0620 | M0C | MARKETING | MARKETING_M_LETTERED | M0C — Repository Constitution, Discovery and Verified Decisions / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0621 | M0D | MARKETING | MARKETING_M_LETTERED | M0D — Repository Constitution, Discovery and Verified Decisions / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0622 | M1A | MARKETING | MARKETING_M_LETTERED | M1A — Business Diagnosis and Commercial Foundation / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0623 | M1B | MARKETING | MARKETING_M_LETTERED | M1B — Business Diagnosis and Commercial Foundation / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0624 | M1C | MARKETING | MARKETING_M_LETTERED | M1C — Business Diagnosis and Commercial Foundation / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0625 | M1D | MARKETING | MARKETING_M_LETTERED | M1D — Business Diagnosis and Commercial Foundation / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0626 | M2A | MARKETING | MARKETING_M_LETTERED | M2A — Doctrine, Knowledge, Evidence and Novice Guidance / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0627 | M2B | MARKETING | MARKETING_M_LETTERED | M2B — Doctrine, Knowledge, Evidence and Novice Guidance / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0628 | M2C | MARKETING | MARKETING_M_LETTERED | M2C — Doctrine, Knowledge, Evidence and Novice Guidance / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0629 | M2D | MARKETING | MARKETING_M_LETTERED | M2D — Doctrine, Knowledge, Evidence and Novice Guidance / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0630 | M3A | MARKETING | MARKETING_M_LETTERED | M3A — Strategy, Scenarios, Campaigns and Command Centre / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0631 | M3B | MARKETING | MARKETING_M_LETTERED | M3B — Strategy, Scenarios, Campaigns and Command Centre / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0632 | M3C | MARKETING | MARKETING_M_LETTERED | M3C — Strategy, Scenarios, Campaigns and Command Centre / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0633 | M3D | MARKETING | MARKETING_M_LETTERED | M3D — Strategy, Scenarios, Campaigns and Command Centre / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0634 | M4A | MARKETING | MARKETING_M_LETTERED | M4A — Content, Brand, SEO, Website and Assets / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0635 | M4B | MARKETING | MARKETING_M_LETTERED | M4B — Content, Brand, SEO, Website and Assets / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0636 | M4C | MARKETING | MARKETING_M_LETTERED | M4C — Content, Brand, SEO, Website and Assets / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0637 | M4D | MARKETING | MARKETING_M_LETTERED | M4D — Content, Brand, SEO, Website and Assets / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0638 | M5A | MARKETING | MARKETING_M_LETTERED | M5A — Consent, Identity, Pipeline and Lifecycle / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0639 | M5B | MARKETING | MARKETING_M_LETTERED | M5B — Consent, Identity, Pipeline and Lifecycle / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0640 | M5C | MARKETING | MARKETING_M_LETTERED | M5C — Consent, Identity, Pipeline and Lifecycle / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0641 | M5D | MARKETING | MARKETING_M_LETTERED | M5D — Consent, Identity, Pipeline and Lifecycle / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0642 | M6A | MARKETING | MARKETING_M_LETTERED | M6A — Social Operations, Reviews and Reputation / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0643 | M6B | MARKETING | MARKETING_M_LETTERED | M6B — Social Operations, Reviews and Reputation / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0644 | M6C | MARKETING | MARKETING_M_LETTERED | M6C — Social Operations, Reviews and Reputation / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0645 | M6D | MARKETING | MARKETING_M_LETTERED | M6D — Social Operations, Reviews and Reputation / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0646 | M7A | MARKETING | MARKETING_M_LETTERED | M7A — Measurement, Attribution, Experiments and Executive Intelligence / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0647 | M7B | MARKETING | MARKETING_M_LETTERED | M7B — Measurement, Attribution, Experiments and Executive Intelligence / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0648 | M7C | MARKETING | MARKETING_M_LETTERED | M7C — Measurement, Attribution, Experiments and Executive Intelligence / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0649 | M7D | MARKETING | MARKETING_M_LETTERED | M7D — Measurement, Attribution, Experiments and Executive Intelligence / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0650 | M8A | MARKETING | MARKETING_M_LETTERED | M8A — Paid Media, Landing Pages and Conversion / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0651 | M8B | MARKETING | MARKETING_M_LETTERED | M8B — Paid Media, Landing Pages and Conversion / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0652 | M8C | MARKETING | MARKETING_M_LETTERED | M8C — Paid Media, Landing Pages and Conversion / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0653 | M8D | MARKETING | MARKETING_M_LETTERED | M8D — Paid Media, Landing Pages and Conversion / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0654 | M9A | MARKETING | MARKETING_M_LETTERED | M9A — Events-as-Marketing, PR, Partners, Creators and Advocacy / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0655 | M9B | MARKETING | MARKETING_M_LETTERED | M9B — Events-as-Marketing, PR, Partners, Creators and Advocacy / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0656 | M9C | MARKETING | MARKETING_M_LETTERED | M9C — Events-as-Marketing, PR, Partners, Creators and Advocacy / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0657 | M9D | MARKETING | MARKETING_M_LETTERED | M9D — Events-as-Marketing, PR, Partners, Creators and Advocacy / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0658 | M10A | MARKETING | MARKETING_M_LETTERED | M10A — Estate Integration: Event OS, Academy and Finance/Control / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0659 | M10B | MARKETING | MARKETING_M_LETTERED | M10B — Estate Integration: Event OS, Academy and Finance/Control / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0660 | M10C | MARKETING | MARKETING_M_LETTERED | M10C — Estate Integration: Event OS, Academy and Finance/Control / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0661 | M10D | MARKETING | MARKETING_M_LETTERED | M10D — Estate Integration: Event OS, Academy and Finance/Control / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0662 | M11A | MARKETING | MARKETING_M_LETTERED | M11A — AI Evaluation, Bounded Autonomy and Production Certification / Domain, shared contracts and API foundation | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0663 | M11B | MARKETING | MARKETING_M_LETTERED | M11B — AI Evaluation, Bounded Autonomy and Production Certification / Frontend, decision experience and accessibility | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0664 | M11C | MARKETING | MARKETING_M_LETTERED | M11C — AI Evaluation, Bounded Autonomy and Production Certification / Durable workflows, integrations and AI/provider boundary | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0665 | M11D | MARKETING | MARKETING_M_LETTERED | M11D — AI Evaluation, Bounded Autonomy and Production Certification / Verification, operations and phase release | `MD Marketing/06_Maison_Doclar_Marketing_OS_TypeScript_Cursor_Prompt_Programme_M0-M11_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0666 | OS-R00 | EVENT_OS | EVENT_OS_RECONCILIATION | Reconciliation preflight and repository truth | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0667 | OS-R01 | EVENT_OS | EVENT_OS_RECONCILIATION | Doctrine registry, provenance and coverage engine | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0668 | OS-R02 | EVENT_OS | EVENT_OS_RECONCILIATION | Event scope and governed cross-event capability | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0669 | OS-R03 | EVENT_OS | EVENT_OS_RECONCILIATION | Executable knowledge and human-judgment boundaries | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0670 | OS-R04 | EVENT_OS | EVENT_OS_RECONCILIATION | Protocol and cultural authority registers | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0671 | OS-R05 | EVENT_OS | EVENT_OS_RECONCILIATION | Privacy, biometrics, retention and staffing policy gates | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0672 | OS-R06 | EVENT_OS | EVENT_OS_RECONCILIATION | Operational standards planning and evidence UX | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0673 | OS-R07 | EVENT_OS | EVENT_OS_RECONCILIATION | Explainable intelligence, alerts and workload controls | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0674 | OS-R08 | EVENT_OS | EVENT_OS_RECONCILIATION | Governed AI shadow mode and production lock | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0675 | OS-R09 | EVENT_OS | EVENT_OS_RECONCILIATION | Academy readiness and deployment integration | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0676 | OS-R10 | EVENT_OS | EVENT_OS_RECONCILIATION | Doctrine change propagation and active-event protection | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0677 | OS-R11 | EVENT_OS | EVENT_OS_RECONCILIATION | Operational validation harness and evidence ledger | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0678 | OS-R12 | EVENT_OS | EVENT_OS_RECONCILIATION | Independent-acceptance readiness and CEO release lock | `MDOS/Maison_Doclar_Event_OS_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0679 | AC-R00 | ACADEMY | ACADEMY_RECONCILIATION | Reconciliation preflight and Academy baseline | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0680 | AC-R01 | ACADEMY | ACADEMY_RECONCILIATION | Doctrine registry and learning traceability | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0681 | AC-R02 | ACADEMY | ACADEMY_RECONCILIATION | Competency and curriculum reconciliation | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0682 | AC-R03 | ACADEMY | ACADEMY_RECONCILIATION | Course-production workflow and editorial frontend | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0683 | AC-R04 | ACADEMY | ACADEMY_RECONCILIATION | Canonical lesson-corpus production programme | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0684 | AC-R05 | ACADEMY | ACADEMY_RECONCILIATION | High-difficulty question and scenario bank | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0685 | AC-R06 | ACADEMY | ACADEMY_RECONCILIATION | Practical assessment and assessor calibration | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0686 | AC-R07 | ACADEMY | ACADEMY_RECONCILIATION | Role paths, horizontal/vertical moves and re-enrolment | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0687 | AC-R08 | ACADEMY | ACADEMY_RECONCILIATION | Certification, renewal and operational authorisation | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0688 | AC-R09 | ACADEMY | ACADEMY_RECONCILIATION | Event-specific training and briefing integration | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0689 | AC-R10 | ACADEMY | ACADEMY_RECONCILIATION | Doctrine/content change propagation and reassessment | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0690 | AC-R11 | ACADEMY | ACADEMY_RECONCILIATION | Training intelligence and event staffing risk | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0691 | AC-R12 | ACADEMY | ACADEMY_RECONCILIATION | Security, privacy and assessment-integrity reconciliation | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0692 | AC-R13 | ACADEMY | ACADEMY_RECONCILIATION | Independent-acceptance readiness and CEO release lock | `MD Academy/Maison_Doclar_Academy_Reconciliation_Cursor_Prompt_Bundle_v1.0.docx` | NOT_EXECUTED | high | NO |
| MD-PR-0693 | MD-USH-ACA-010 | USHERING | USHERING_ACADEMY_RECONCILIATION | Academy Premium Ushering Cursor Reconciliation Prompt (single authorised prompt) | `MD-Premium Usher system/10_Maison_Doclar_Academy_Premium_Ushering_Cursor_Reconciliation_Prompt_v1.0_DRAFT.docx` | NOT_EXECUTED | high | NO |

## Traceability chain established in B0

```
Prompt Control ID → native prompt ID → source document/file → current repository path
  → product → phase/slice → dependencies → canonical references → execution status
  → (implementation commit: none yet)
```

Future slices append implementation commits and evidence. Prompt Control IDs will not be recycled.

