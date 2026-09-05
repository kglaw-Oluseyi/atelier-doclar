# Control Tower runbook

**Slice:** MD-CT9  
**Prompt Control ID:** `MD-PR-0009` is CT8; this runbook is authorised by `MD-PR-0010`  
**Status:** Implementation record — not production authorisation

## Health

`pnpm programme:validate` and `pnpm programme:project` are the local truth checks. `/programme/ops` reports Control Tower health. UNKNOWN GitHub/CI is not healthy.

## Failures

| Failure | Control Tower | Event OS / Event-Day |
|---------|---------------|----------------------|
| GitHub unavailable | DEGRADED | not implied |
| CI unavailable | DEGRADED | not implied |
| RAG unavailable | DEGRADED; roadmap remains | not implied |
| Stale snapshot | STALE / DEGRADED | not implied |
| Corrupt event | rejected at append | not implied |
| Inaccessible evidence | ERROR/DEGRADED | not implied |
| Permission failure | DENIED/DEGRADED | not implied |
| Partial data | DEGRADED | not implied |

## Recovery

1. Restore the last verified snapshot (`reconstructFromSnapshot`).
2. Re-run `pnpm programme:project`.
3. Reconcile synthetic evidence only (`pnpm programme:reconcile`). Live GitHub reconcile remains disabled.

## Release

Independent and CEO gates remain unsigned. Cursor may state CT9 IMPLEMENTATION COMPLETE. Cursor may not state PRODUCTION APPROVED.
