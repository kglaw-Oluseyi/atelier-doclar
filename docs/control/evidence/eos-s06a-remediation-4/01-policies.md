# Remediation 4 — policies

## Plan collection

Ledger already stores multiple plans per event. Remediation replaces single-latest UI projection with event-scoped `planSummaries` queue/history. Compiling plan B does not mutate plan A. Selection via `?planId=`.

## Concurrency

Each plan retains its own claim/idempotency boundary (`claimPlanExecution` by planId). Approving/executing A cannot settle B.

## Approval audit

`atelierCommand.approve` / `confirm` write searchable Executive Ledger rows with dedicated correlation IDs, plan/version/hash/maker/checker/decision/dataChanged=false. Self-approval and other refusals emit DENIED rows. Plan-local `PLAN_APPROVAL` receipt agrees.

## Accessibility

Focused Playwright + axe-core matrix at 1440/768/390, keyboard focus, reduced-motion, 200% zoom equivalent. Exact axe counts recorded in live evidence.
