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
