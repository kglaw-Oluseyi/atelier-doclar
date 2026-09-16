# EOS-S06A Remediation 4 — Phase 1 reconstruction

Captured: 2026-09-16

## Identities (confirmed)

| Surface | Value |
|---|---|
| Application SHA | `e490762edcaf482960dcd19aadf81f625355a8d0` |
| Documentation HEAD | `dff09afde72f1234701a23e12f2aaa44aa52e638` |
| Railway deployment | `8754cb6e-c776-4d6a-91c2-9a984a4fd76c` |
| Runtime | POSTGRES · APPLIED · productionAuthorised:false · providers INACTIVE |
| Control Tower | SKIPPED (untouched) |
| Repo tip | `dff09af…` |

## DEFECT A — James Whitfield displaced R3 plan

| Field | Value |
|---|---|
| Maker | James Whitfield (Planner) `…000043` |
| Event | Alpha One `…000021` |
| Plan ID | `af38a175-62ac-4df7-8301-0c7ff82760f2` |
| Plan version | 1 |
| Instruction ID | `404be30f-41f3-49d3-a78d-52df537ed75c` |
| Task | `tb.supplier.decision` v1 |
| Risk | R3 |
| State | **AWAITING_APPROVAL** (still pending) |
| Created | 2026-09-16T00:18:47.537Z |
| Approval requirement | yes (maker-checker) |
| Still in ledger? | **YES** — not deleted/mutated |
| Why UI hid it | Workspace loads all event plans, but UI selects only `latestPlan = sort(createdAt)[0]`. Later Planner Task Bank compiles (investment/roadmap/merch/evidence/programme) became the single visible slot. |

Raw text (truncated): Prepare decision or approval packet / Synthetic/test only: prepare supplier decision…

## DEFECT B — Amara → George approval audit gap

| Field | Value |
|---|---|
| Maker | Amara Okonkwo (Event Director) `…000042` |
| Checker | George Lawson (CEO) `…000041` |
| Plan ID | `54b9f6f7-f2af-42ae-ba7e-d470676f0d65` |
| Task | `tb.supplier.decision` v1 |
| Risk | R3 |
| State | COMPLETED |
| Approval identity | `approve:54b9f6f7-…:v1:<hash>:…000041` |
| Approved at | 2026-09-16T03:42:17.243Z |
| Execution correlation | `16e1b6c8-c7f4-437d-83b4-f0def38e5aac` |
| Plan-local history | Approval fields present on plan; RUN_RECEIPT for execution |
| Executive Ledger | **No `atelierCommand.approve` row** for this approval; only task compile + execute are indexed |

Root cause B: `approveAtelierCommandPlan` / `confirmAtelierCommandPlan` persist plan state but do not emit independently searchable approval audit events with their own correlation IDs.

## Historical policy

Do not delete or rewrite Whitfield plan `af38a175-…`. Keep it AWAITING_APPROVAL so the queue can surface it after remediation.
