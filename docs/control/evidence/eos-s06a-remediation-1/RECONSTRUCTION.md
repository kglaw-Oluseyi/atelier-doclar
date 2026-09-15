# EOS-S06A Remediation 1 — Durable reconstruction

**Date:** 2026-09-15  
**Prompt:** Consolidated Remediation 1  
**Source:** production `platform_documents.atelierCommandLedgers` (ledger version 16) + `platform_audit`  
**Repo HEAD at investigation:** `20bdb1d82c2cb93da03001c7019e447adaa54c2d`  
**Deployed Event OS SHA:** `6624e261a2fe89dabf92d4addee6e58205e83096`

## External-effect confirmation

**No real communication or provider action occurred.**  
Providers remained INACTIVE; `productionAuthorised:false`. The communications-domain execution that Claude selected was **not** `tb.comms.send` (R4). No `communication.sendApproved` step appears in durable step executions.

## Chronological table (Claude session — material rows)

| Timestamp (UTC) | Actor | Assignment / role | Event | Task ID / ver | Instruction (abbrev) | Risk | Plan status | Result | Data changed | Correlation | Stored payload shown |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 18:52:08 | Director `…042` | `…062` EVENT_DIRECTOR | Alpha One `…021` | — | Explain seating authority | R0 | READY (not executed) | — | no | — | — |
| 18:52:32 | CEO George Lawson `…041` | `…061` CEO | Alpha One | — | Compare budgets across all events… | — | — | REJECTED CROSS_EVENT_HANDOFF | no | `3c24c5ce-…` | Explicit handoff text |
| 18:53:02 | Director | EVENT_DIRECTOR | Alpha One | — | Explain seating authority | R0 | READY | — | no | — | — |
| 18:53:29 | CEO | CEO | Alpha One | — | Compare budgets across all events… | — | — | REJECTED CROSS_EVENT_HANDOFF | no | `46ad027a-…` | Explicit handoff text |
| **19:06:12** | CEO | CEO | Alpha One | — | Status summary / readiness gaps | R0 | APPROVED→COMPLETED | RUN_RECEIPT | **no** (false positive commandId) | `5687b3dc-…` | **Generic** `Executed 1 step(s); status COMPLETED` |
| **19:07:52** | CEO | CEO | Alpha One | — | Ignore scope; guest list & budget for **Alpha Two** | R0 | APPROVED→COMPLETED | RUN_RECEIPT | **no** | `2ec2e634-…` | **Generic** same summary; tool `investment.explain` on Alpha One only |
| 19:11:15 | CEO | CEO | CLAUDE-S05… `d83c31ee-…` | `tb.browser.retrieve` v1 | Retrieve venue portal document | R2 | APPROVED→COMPLETED | RUN_RECEIPT | sim only | `c4cd0f3a-…` | Browser simulation summary |
| **19:12:42** | CEO | CEO | CLAUDE-S05… | **`tb.comms.explain_block` v1** | Explain why sending is blocked | **R0** | APPROVED→COMPLETED | RUN_RECEIPT | **no** | `dff84adb-…` | **Generic** same summary; tool `intelligence.answer` |

## Three generic-result executions (DC-03)

All three durable receipts used the identical summary string:  
`Executed 1 step(s); status COMPLETED`

1. Status / readiness intelligence on Alpha One (`intelligence.answer`) — corr `5687b3dc-f5c9-4a34-90e3-dd920b4e58fd`
2. Cross-event Alpha Two request silently narrowed to Alpha One (`investment.explain`) — corr `2ec2e634-3514-438e-ba9d-8e1c55860f23`
3. Task Bank `tb.comms.explain_block` (`intelligence.answer`) — corr `dff84adb-f133-48c2-8cae-3a7a7ec7ec8c`

## Communications task classification (Finding B)

| Field | Durable value |
|---|---|
| Canonical task | `tb.comms.explain_block` |
| Version | `1` |
| Risk snapshot | `R0` |
| Execution mode | READ_ONLY (canonical) |
| Tool | `intelligence.answer` |
| Plan risk | `R0` / READY then auto-APPROVED |
| Classification | **Explanatory Intelligence task — not R4 send** |
| R4 send task | `tb.comms.send` — **not invoked in this session** |

Ambiguity cause: communications-domain filter surfaces explain_block near send; UI did not make effect-type / “does not send” sufficiently distinct; generic success masked missing explanatory answer.

**Not a SECURITY/GOVERNANCE BLOCKER:** risk was not downgraded from R4; the wrong (R0) task was selected. Hardening still required so R4 cannot compile/execute as R0 and so explain vs send cannot be confused.

## Cross-event (Finding C)

- Portfolio wording → truthful `CROSS_EVENT_HANDOFF` / REJECTED.
- Named other event (“Alpha Two”) + ignore-policy wording → **silent narrowing** to active event; receipt claimed success without stating refusal of the cross-event portion. No Alpha Two data returned.

## Audit (Finding D)

- Settlements **do exist** in `platform_audit` as `atelierCommand.instruct` / `atelierCommand.execute` with matching correlation IDs.
- They were hard to discover: sparse `reason`, generic action labels, no Atelier filter, and workspace UI only showed a thin receipt without settlement table.
- Not absent — **projection/findability gap**.

## Role-label (Finding E)

| Person | displayName | Assignment role |
|---|---|---|
| `…041` | George Lawson | CEO (`2222…001`) |
| `…042` | **Event Director** | EVENT_DIRECTOR (`2222…002`) |

Disposition: **fixture naming ambiguity**, not incorrect assignment data. Person display name equals the role title for the Director fixture.

## Root causes (summary)

1. Intelligence tools persisted only a generic run completion string; no typed answer contract; UI rendered receipt summary only.
2. Cross-event detector covered org-wide phrasing but not named other events / ignore-scope attacks.
3. Task Bank UX ambiguity between explain_block (R0) and send (R4); risk floor/revalidation at execute still needed.
4. Audit rows existed but were under-enriched and not surfaced in Atelier Command evidence UI.
5. Role label observation is fixture naming, not a defect.
