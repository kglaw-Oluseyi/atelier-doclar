# Remediation 4 — live CAS diagnosis and a11y axe counts

## Execute stuck on APPROVED (pre-fix)

Whitfield plan `af38a175-62ac-4df7-8301-0c7ff82760f2` remained `APPROVED` after Director clicked Execute.

Flash/result:

- ACTION: `atelierCommand execute`
- RESULT: Not applied
- CODE path: `VERSION_CONFLICT` / “The record changed elsewhere”
- Correlation example: `a40081ec-dfbc-419f-9430-0f6a0b3a74e9`
- Did data change: No

Root cause: `executeAtelierCommandPlan` claimed the plan in a cloned snapshot, then **awaited** seating projection before persist. Concurrent multi-plan ledger writers on the same `platform_documents` row advanced the CAS version; execute persist lost and left the durable plan unchanged.

Fix: load seating before claim; claim+execute+persist without intervening await; retry persisted CAS conflicts for atelier writers.

## Approval audit (confirmed before execute fix)

- Approval correlation: `e71f9e4d-bf0d-4967-a076-5f5a2dfcb6e7`
- Plan-local `PLAN_APPROVAL` present
- Executive Ledger `atelierCommand.approve` SUCCESS searchable by CEO/Auditor
- Event Director correctly refused org-wide audit (`This assignment cannot view the audit ledger`)

## Axe-core counts (live matrix)

| Surface | Width | Violations | IDs |
| --- | ---: | ---: | --- |
| atelier-command-main | 1440 | 0 | — |
| atelier-command-main | 768 | 0 | — |
| atelier-command-main | 390 | 0 | — |
| atelier-command-taskbank | 1440 | 1 | `color-contrast:79` |
| executive-ledger | 1440 | 0 | — |
| executive-ledger | 768 | 0 | — |
| executive-ledger | 390 | 0 | — |

Genuine contrast finding on Task Bank @ 1440 retained (not silenced).
