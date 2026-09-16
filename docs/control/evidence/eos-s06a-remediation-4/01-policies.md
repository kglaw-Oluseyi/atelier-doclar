# Remediation 4 — policies

## Plan collection

Ledger already stores multiple plans per event. Remediation replaces single-latest UI projection with event-scoped `planSummaries` queue/history. Compiling plan B does not mutate plan A. Selection via `?planId=`.

## Concurrency

Each plan retains its own claim/idempotency boundary (`claimPlanExecution` by planId). Approving/executing A cannot settle B.

Domain evidence (seating projection) loads **before** claim/execute so no durable mutation is held across an await. Atelier Command ledger writers (`instruct` / `task` / `approve` / `confirm` / `execute` / workspace session create) retry on **persisted document CAS** conflicts (`VERSION_CONFLICT` from `platform_documents`) so concurrent multi-plan compilers cannot discard a sibling plan or leave an approved plan stuck. Plan-scoped conflicts (hash mismatch, already in progress) are not retried into a different outcome. Already-approved plans settle once on concurrent/CAS-retry approval.

## Approval audit

`atelierCommand.approve` / `confirm` write searchable Executive Ledger rows with dedicated correlation IDs, plan/version/hash/maker/checker/decision/dataChanged=false. Self-approval and other refusals emit DENIED rows. Plan-local `PLAN_APPROVAL` receipt agrees.

## Accessibility

Focused Playwright + axe-core matrix at 1440/768/390, keyboard focus, reduced-motion, 200% zoom equivalent. Exact axe counts recorded in live evidence.
