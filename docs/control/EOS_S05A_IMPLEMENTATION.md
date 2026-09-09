# EOS-S05A Implementation Record

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S039`
**Title:** Discovery, Investment & Executive Event Command
**Status:** `REMEDIATED / NOT ACCEPTED`
**Starting baseline for MD-PR-S039:** `566df703672209007da9ee3de180a8913a7be78b`
**Catalogue slice:** no — accepted-slice count remains 5
**Production:** unauthorised

This record tracks implementation against the ratified corpus. It is not an acceptance record.

## Authority range

| Range | Status |
|-------|--------|
| Ratified specification (00–03, 02A, 05, Volumes 04A–04D) | RATIFIED |
| `EEC-00`–`EEC-10` | IMPLEMENTED (Foundation Milestone A, then consent correction) |
| `EEC-11`–`EEC-45` | DEEPENED under `MD-PR-S039`; not accepted |
| EOS-S06 | `NOT_STARTED / NOT_AUTHORISED` |
| Independent acceptance | NOT GRANTED |

## Current disposition

| Unit | Disposition |
|------|-------------|
| `EEC-00`–`EEC-05` | COMPLETE |
| `EEC-06` | COMPLETE — durable session mode is authoritative; transition `mode` is rejected |
| `EEC-07` | COMPLETE — staff notes plus private object-storage path on the existing layout store |
| `EEC-08`–`EEC-10` | COMPLETE |
| `EEC-11`–`EEC-14` | PARTIAL — brief draft/submit/decide/publish and conversion proven; workbench remains stacked Command Atelier, not a three-column component library |
| `EEC-15`–`EEC-25` | PARTIAL — governed knowledge, PRICE_REF rules, labelled synthetic evidence, conditional BOM, traces, uncertainty bands, scenarios, contingency and Budget Studio exist; COMPLETE status is refused for synthetic-only prices |
| `EEC-26`–`EEC-32` | PARTIAL — milestone model, templates, CPM earliest/latest/float, compression/infeasibility and Roadmap Studio exist; calendar-day placement still uses duration integers, not a full Lagos working-day calendar |
| `EEC-33`–`EEC-36` | PARTIAL — fixture AI remains proposal-only; change impact is hash-bound with destination-owned stale-marking; RSVP NONE is evidenced |
| `EEC-37`–`EEC-40` | PARTIAL — conversational client interview, no-repeat turns, client overview and decision-first Event Command exist; AI evaluation corpus (EEC-39) remains a schema stub |
| `EEC-41`–`EEC-45` | PARTIAL / NOT ACCEPTED — gates and Event OS deploy are required evidence, not acceptance |

## Foundation consent correction (`MD-PR-S038` Part I)

Root cause identified in AI CTO review: `sessionLifecycleOnSnap` used caller-supplied `input.mode` after session creation, so `START`/`RESUME` with spoofed `OFFLINE_NOTES` bypassed participation consent. A second defect returned an already-ACTIVE session on idempotent `RESUME` before re-evaluating withdrawn consent.

Correction: discriminated CREATE vs transition schemas; durable `InterviewSession.mode` is authoritative after CREATE; START/RESUME re-evaluate current engagement-wide PARTICIPATION; latest consent wins by `decidedAt`, then `createdAt`, then insertion order; `DECLINED`/`WITHDRAWN` are not active consent; dimensions stay independent.

## Product-depth remediation (`MD-PR-S039`)

S038 recorded `EEC-11`–`EEC-45` complete. Independent review found scaffolds: hardcoded NGN rule constants, flat `itemCodes`, 90/115 uncertainty padding, longest-chain critical path, regex change impact, assertion-confirm client page, and count-only Event Command.

S039 preserves that foundation and adds durable product depth: vendor price-card editions and labelled synthetic evidence; quantity-only `PRICE_REF` rules; conditional BOM snapshots bound to template/brief/assumption/observation hashes; Zod-validated AST with FX conversion; evidence-derived ranges; scenario comparison and sensitivity; explicit contingency; CPM schedule with float and infeasibility; destination-owned change propagation; conversation turns with no-repeat orchestration; and a decision-first Executive Event Command.

Unsupported seed amounts are no longer presented as current prices. A synthetic-only calculation is `PARTIAL`, not `COMPLETE`.

`EEC-11`–`EEC-45` are not marked complete. EOS-S05A is not accepted. Claude-in-Chrome was not run. EOS-S06 was not started. Control Tower was not deployed.

## Corrected EEC-11–EEC-45 requirement matrix (`MD-PR-S039`)

Classification is against durable behaviour, governed transitions, permission-safe projections, functional UI and negative evidence. A heading, schema name, barrel export or single happy-path click is not COMPLETE.

| Range | Classification | Justification |
|-------|----------------|---------------|
| EEC-11 Brief draft/submit/decide/publish | IMPLEMENTED_AND_PROVEN | Working edition, exact-hash submit, maker/checker, publish and conversion exist in platform tests and live E2E |
| EEC-12 Client confirmation | PARTIAL | Client overview and correction lineage exist; confirmation is not a separate ratified client-sign-off product |
| EEC-13 Conversion | IMPLEMENTED_AND_PROVEN | Explicit conversion receipt; wrong-hash retry remains a conflict |
| EEC-14 Brief workbench UX | PARTIAL | Command Atelier stacked workspace, not a three-column component library |
| EEC-15 Price knowledge | PARTIAL | Vendor cards, editions, market/FX/location/season records exist; evidence is labelled synthetic; no live provider |
| EEC-16 Conditional BOM | IMPLEMENTED_AND_PROVEN | Immutable template edition, predicates, mutex, snapshot hashes |
| EEC-17 Rule language | IMPLEMENTED_AND_PROVEN | Closed AST, BigInt, FX node, missing-driver/lookup failures; no `z.unknown()` durable contract |
| EEC-18 Trace and uncertainty | IMPLEMENTED_AND_PROVEN | Line traces, evidence-derived ranges, deterministic result hash |
| EEC-19 Scenarios and sensitivity | IMPLEMENTED_AND_PROVEN | Protected/recommended/alternative purposes, delta, principal drivers |
| EEC-20 Contingency and financial-state | PARTIAL | Explicit contingency and distinct declarations; no payments/receipts/bank instructions (correct exclusion) |
| EEC-21 Budget governance | IMPLEMENTED_AND_PROVEN | Submit, exact-hash decide, maker/checker, no self-approve |
| EEC-22–EEC-25 Budget Studio / Investment UX | PARTIAL | Planner Studio and CEO investment panels work; client investment is framing only (`TDR-S05A-004`) |
| EEC-26 Roadmap domain | PARTIAL | Milestone identity, edition, dependencies, confidence; dates are duration integers (`TDR-S05A-005`) |
| EEC-27 Roadmap templates | IMPLEMENTED_AND_PROVEN | Versioned templates bound to Brief/Budget hashes |
| EEC-28 CPM schedule | IMPLEMENTED_AND_PROVEN | Cycle rejection, earliest/latest, float, named critical path |
| EEC-29 Compression / infeasibility | IMPLEMENTED_AND_PROVEN | Compressed, feasible-with-risk, infeasible; no fabricated confidence |
| EEC-30–EEC-31 Roadmap Studio / client roadmap | PARTIAL | Staff studio is functional; client roadmap is overview-level, not a dedicated mobile timeline product |
| EEC-32–EEC-36 Change intelligence | IMPLEMENTED_AND_PROVEN | Hash-bound impact, destination-owned propagation, RSVP NONE evidenced, no self-decide |
| EEC-37–EEC-38 Conversational interview | PARTIAL | Resumable client-token interview, no-repeat, pause/resume, AI fixture boundary; not a full Maison consultation corpus |
| EEC-39 Evaluation corpus | MISSING | Schema stub only (`TDR-S05A-003`) |
| EEC-40 Executive Event Command | PARTIAL | Decision-first command with selector, hashes, exceptions and named critical path; not every ratified drill-down surface |
| EEC-41–EEC-44 Assurance / live token / object / roles | PARTIAL | Focused, package, E2E and live token/object/role paths proven; Claude-in-Chrome not run |
| EEC-45 Acceptance | NOT_APPLICABLE | This run is not acceptance authority |

S038 rows that claimed COMPLETE for EEC-11–EEC-45 are `INACCURATELY_REPORTED` and superseded by this matrix.

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
