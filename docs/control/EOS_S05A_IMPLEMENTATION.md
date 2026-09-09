# EOS-S05A Implementation Record

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S045` (truthful-decision remediation; prior `MD-PR-S043` / `MD-PR-S041`)
**Title:** Discovery, Investment & Executive Event Command
**Status:** `IMPLEMENTED / NOT ACCEPTED`
**Starting baseline for MD-PR-S045:** `a795947bd2c3bd2ff16cccaa1fbe26fd5cd6d77d`
**Application/test SHA:** `e63313de72018840075b853841da97d08ab13a42`
**Live Event OS deploy:** `495c5174-d3c2-4986-8ed5-162fb6a256db`
**Catalogue slice:** no — accepted-slice count remains 5
**Production:** unauthorised

This record tracks implementation against the ratified corpus. It is not an acceptance record.

## Authority range

| Range | Status |
|-------|--------|
| Ratified specification (00–03, 02A, 05, Volumes 04A–04D) | RATIFIED |
| `EEC-00`–`EEC-10` | IMPLEMENTED |
| `EEC-11`–`EEC-44` | COMPLETED under `MD-PR-S040`; not accepted |
| `EEC-45` | Outside Cursor acceptance authority |
| EOS-S06 | `NOT_STARTED / NOT_AUTHORISED` |
| Independent acceptance | NOT GRANTED |

## Current disposition

| Unit | Disposition |
|------|-------------|
| `EEC-00`–`EEC-10` | COMPLETE |
| `EEC-11` | COMPLETE — draft/submit/decide/publish |
| `EEC-12` | COMPLETE — hash-bound client review edition and sign-off |
| `EEC-13` | COMPLETE — explicit conversion |
| `EEC-14` | COMPLETE — Brief Review Workbench with labelled regions |
| `EEC-15`–`EEC-21` | COMPLETE — governed synthetic/manual evidence; payments remain excluded |
| `EEC-22`–`EEC-25` | COMPLETE — Budget Studio plus dedicated client investment route |
| `EEC-26`–`EEC-32` | COMPLETE — calendar working-day placement and client roadmap |
| `EEC-33`–`EEC-36` | COMPLETE — fixture AI proposal-only; hash-bound change adapters |
| `EEC-37`–`EEC-38` | COMPLETE — versioned interview corpus and no-repeat orchestration |
| `EEC-39` | COMPLETE under `MD-PR-S041` — executable corpus, runner, persisted case results and fail-closed readiness. The S040 boolean self-report evaluator is removed. |
| `EEC-40` | COMPLETE — decision-first Event Command with drill-downs |
| `EEC-41`–`EEC-44` | COMPLETE as implementation evidence; Claude is an independent later gate |
| `EEC-45` | NOT_APPLICABLE — acceptance is not this authority |

## Corrected EEC-11–EEC-45 requirement matrix (`MD-PR-S040`)

S039 PARTIAL/MISSING rows are reassessed against functional and test evidence. Synthetic evidence and inactive providers do not keep a complete architecture partial. Claude not yet run does not keep implementation units incomplete.

| Range | Classification | Justification |
|-------|----------------|---------------|
| EEC-11 Brief draft/submit/decide/publish | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-12 Client confirmation | IMPLEMENTED_AND_PROVEN | Distinct review edition, states, exact-hash confirm, lineage, no auto brief approval |
| EEC-13 Conversion | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-14 Brief workbench UX | IMPLEMENTED_AND_PROVEN | Desktop three-region workbench; stacked labelled regions on small screens |
| EEC-15 Price knowledge | IMPLEMENTED_AND_PROVEN | Governed cards/observations; labelled synthetic evidence; no live provider required |
| EEC-16 Conditional BOM | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-17 Rule language | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-18 Trace and uncertainty | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-19 Scenarios and sensitivity | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-20 Contingency and financial-state | IMPLEMENTED_AND_PROVEN | Distinct declarations; payment execution remains prohibited |
| EEC-21 Budget governance | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-22–EEC-25 Budget Studio / Investment UX | IMPLEMENTED_AND_PROVEN | Staff Studio plus dedicated client investment route (`TDR-S05A-004` closed) |
| EEC-26 Roadmap domain | IMPLEMENTED_AND_PROVEN | Calendar definition, timezone, working days, date placement (`TDR-S05A-005` closed) |
| EEC-27 Roadmap templates | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-28 CPM schedule | IMPLEMENTED_AND_PROVEN | Duration CPM retained; calendar dates added |
| EEC-29 Compression / infeasibility | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-30–EEC-31 Roadmap Studio / client roadmap | IMPLEMENTED_AND_PROVEN | Staff calendar list plus dedicated client roadmap |
| EEC-32–EEC-36 Change intelligence | IMPLEMENTED_AND_PROVEN | Unchanged S039 proof |
| EEC-37–EEC-38 Conversational interview | IMPLEMENTED_AND_PROVEN | Versioned corpus, overlays, fatigue pause, no-repeat |
| EEC-39 Evaluation corpus | IMPLEMENTED_AND_PROVEN | `MD-PR-S041` executable probes replace the S040 boolean self-report; V4 migration; 33 persisted case results; negative controls detect unsafe adapters (`TDR-S05A-003` closed on the actual runner) |
| EEC-40 Executive Event Command | IMPLEMENTED_AND_PROVEN | Review status, exceptions, investment/roadmap/change drill-downs |
| EEC-41–EEC-44 Assurance | IMPLEMENTED_AND_PROVEN | Implementation and automated/live evidence; Claude remains deferred |
| EEC-45 Acceptance | NOT_APPLICABLE | This run is not acceptance authority |

## Final-completion tranche (`MD-PR-S040`)

S040 preserves the S039 engines and completes the remaining product gaps: client review editions, Brief Review Workbench, client investment, Lagos-configurable calendars, interview coverage corpus, evaluation/red-team runner, and Event Command drill-downs.

`TDR-S05A-003`, `TDR-S05A-004` and `TDR-S05A-005` are CLOSED. `MD-PR-S041` closed EEC-39 only after the executable runner, case-result persistence, negative controls and live CEO fixture pass existed. EOS-S05A is not accepted. Claude-in-Chrome was not run. EOS-S06 was not started. Control Tower was not deployed.

## MD-PR-S042 findings and MD-PR-S043 disposition

MD-PR-S042 independent verification found three related release blockers plus associated UX/accessibility gaps. `MD-PR-S043` remediates them in one engineering batch. This is not acceptance.

| Finding | Observed defect | S043 disposition |
|---------|-----------------|------------------|
| A | Confidential surprise evidence leaked to Auditor without an explicit disclosure grant | One server-owned `decideDiscoveryDisclosure` policy; Auditor and System Administrator have no implicit reveal; masked DTO omits original title/body/identity/object key; grants honour expiry/revocation at read time |
| B | Extraction reported success while omitting a 360-guest conflicting assertion | Durable extraction outcome per eligible segment; truthful receipt counts; guest-count patterns including `closer to 360 people`; 320 vs 360 remains OPEN until human resolution; idempotent retry; stale version conflict |
| C | Client interview bundled consent into one yes/no | Six independent consent dimensions; no `acceptAll` database truth; client token path; staff cannot fabricate client consent |
| Related UX | Raw engagement code as client heading; save jumped to page top; Budget Studio seeded `180`; Admin label `Identity unavailable` | Client-safe heading; section-local receipts and scroll restore; prefill only from current confirmed brief guest count; Admin `Event scope restricted` / `Assignment identity restricted` |

No new defect-specific TDR is opened. Established safe debt is unchanged.

## MD-PR-S045 truthful-decision remediation

MD-PR-S044 established two remaining defects plus a Budget Studio intelligibility gap. `MD-PR-S045` remediates them without weakening the governing-brief gate. This is not acceptance.

| Finding | Observed defect | S045 disposition |
|---------|-----------------|------------------|
| A | Idempotent extraction replay created no duplicate assertion but the receipt still said `1 proposed, 0 duplicate` | Durable `ExtractionOutcome` history is unchanged. The current invocation returns `newlyProposedCount` / `existingLinkedCount` / `replayed`. Identical source identity/version does not write a second `assertion.proposed` creation audit. |
| B | `Supersede earlier value` bound the first recorded assertion, so 320 governed when the operator chose 360 | Operators select an explicit candidate by assertion identity. Server command `SELECT_GOVERNING_ASSERTION` validates IDs against this contradiction. Legacy `SELECT`/`selectedAssertionId` remains valid. Relative earlier/later labels are removed. |
| Budget | Prefill was attempted from working/submitted or staff-reviewed-only facts | Adapter returns `CURRENT_BRIEF` only for the current `APPROVED` or `PUBLISHED` edition. Approved unpublished remains intentionally eligible. `BRIEF_NOT_CURRENT` / `UNRESOLVED_CONTRADICTION` / `UNKNOWN` do not prefill. Arbitrary `180` is not inserted. Maker/checker remains: the submitting maker cannot decide the edition. |

MD-PR-S044 auditor masking, client isolation and accessibility were not reopened. Staff-reviewed-but-unpublished is not governing Budget truth. No new defect-specific TDR is opened. EOS-S05A is not accepted. Claude was not run. EOS-S06 was not started. Control Tower was not deployed. `productionAuthorised` remains false.

## Exclusions that remain in force

- No parallel identity, Client, Event, RSVP, forecast, programme, venue, audit or persistence layer.
- No Control Tower deployment.
- No live external AI, speech, transcription or communications provider.
- No provider secrets requested or stored.
- Claude-in-Chrome remains deferred until independent whole-slice verification.
- EOS-S05A is not accepted.
- `productionAuthorised` remains false.
- `MD-PR-S036` is not consumed.
- EOS-S06 is not started.
