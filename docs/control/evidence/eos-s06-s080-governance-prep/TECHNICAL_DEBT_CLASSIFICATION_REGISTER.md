# Technical-Debt Classification Register — MD-PR-S080 Governance Prep

**Control ID:** `MD-PR-S080`
**Date:** `2026-09-16`
**Purpose:** Classify retained open debts before bounded EOS-S06C implementation authority.
**Canonical narrative entries:** `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md`
**Prior S080 index:** `docs/control/evidence/eos-s06-gate1-auth-closure/TECHNICAL_DEBT_ENTRIES.md`

## Rules applied

- Every debt below remains **OPEN**.
- No debt is marked resolved, accepted, waived or closed by this register.
- Where a field is not already authoritative in control evidence, the value is `UNKNOWN`, `REQUIRES TRIAGE` or `NOT YET CLASSIFIED`.
- This register does not invent technical facts beyond existing control records.

## Register

### TDR-S06A-001

| Field | Value |
|-------|-------|
| Debt ID | `TDR-S06A-001` |
| Current status | `OPEN` |
| Owner | Event OS / AI CTO |
| Severity | `LOW` (authoritative in cumulative register) |
| Affected control or component | Atelier Command Intelligence cross-event named-event refusal / handoff UX |
| Blocks S06B | `REQUIRES TRIAGE` — not stated as an S06B implementation blocker in authoritative records |
| Blocks S06C | `REQUIRES TRIAGE` — not stated as an S06C implementation blocker in authoritative records |
| Blocks production | `YES` — BLOCKING before production authorisation |
| Required evidence | Explicit named-event refusal/handoff for recognised cross-event references; no unrelated domain copy; receipt covers requested event, authorised event, no disclosure, no mutation, correct next step |
| Acceptance criteria | Regression coverage for event names, aliases and IDs; recognised references return explicit event-scope refusal/handoff |
| Compensating control | Safe-deflect currently prevents data disclosure and mutation (no security-boundary failure recorded) |
| Next decision | Remediate before production authorisation; triage whether S06B implementation may proceed with debt OPEN |
| Evidence reference | `docs/control/EOS_S06A_ACCEPTANCE.md`; cumulative register `TDR-S06A-001` |

### TDR-S06-002

| Field | Value |
|-------|-------|
| Debt ID | `TDR-S06-002` |
| Current status | `OPEN` |
| Owner | Event OS / AI CTO |
| Severity | `LOW` (authoritative) |
| Affected control or component | Seating V2 launch / persist path |
| Blocks S06B | `NO` per current NON_BLOCKING classification — confirm at S06B authority gate |
| Blocks S06C | `NO` per current NON_BLOCKING classification — confirm at S06C authority gate |
| Blocks production | `REQUIRES TRIAGE` — recorded NON_BLOCKING for product acceptance; production preference not separately dispositioned |
| Required evidence | Gate E timing classification preserved; no silent queue/worker without authority |
| Acceptance criteria | Interactive-latency / persist TX targets addressed under separate performance authority, or explicitly accepted with compensating control |
| Compensating control | Gate E bounds met without a worker under MD-PR-S073 |
| Next decision | Separate performance authority after EOS-S06 acceptance (already accepted); triage production impact |
| Evidence reference | `docs/control/eos-s06/MD_PR_S073_PACKET_7_GATE_E_TIMING.md`; cumulative register `TDR-S06-002` |

### TDR-S06-003

| Field | Value |
|-------|-------|
| Debt ID | `TDR-S06-003` |
| Current status | `OPEN` |
| Owner | Event OS / AI CTO |
| Severity | `MEDIUM` (authoritative) |
| Affected control or component | Extended historical Playwright corpus / programme-validate gating policy |
| Blocks S06B | `NO` per current NON_BLOCKING classification — confirm at S06B authority gate |
| Blocks S06C | `NO` per current NON_BLOCKING classification — confirm at S06C authority gate |
| Blocks production | `REQUIRES TRIAGE` — must not be greenwashed; production gate policy not yet separately signed |
| Required evidence | Separate current-product vs historical gates; failing historical contracts retained |
| Acceptance criteria | Dedicated historical browser-contract reconciliation authority completes, or production gate explicitly accepts retained failure with compensating control |
| Compensating control | Current-product shard 0 (`eos-s06-current-acceptance`) PASS on run `35001426000`; historical failure retained as controlled debt |
| Next decision | Dedicated historical reconciliation authority; do not delete or silently waive |
| Evidence reference | GitHub Actions run `35001426000`; `docs/control/EOS_S06_ACCEPTANCE.md`; `docs/control/evidence/eos-s06-successor-layout-staleness/MANIFEST.md` |

### TDR-S06-004

| Field | Value |
|-------|-------|
| Debt ID | `TDR-S06-004` |
| Current status | `OPEN` |
| Owner | Event OS / AI CTO |
| Severity | `MEDIUM` (authoritative) |
| Affected control or component | Seating / rule lifecycle UI pending state |
| Blocks S06B | `REQUIRES TRIAGE` — NON_BLOCKING for Gate 1; not classified against S06B |
| Blocks S06C | `REQUIRES TRIAGE` |
| Blocks production | `YES` — BLOCKING before production authorisation / broader operator rollout |
| Required evidence | Successful rule save clears pending state without refresh; failure paths re-enable controls |
| Acceptance criteria | Pending-state regression for success and failure paths |
| Compensating control | Manual refresh reveals successful save; no demonstrated data-integrity failure |
| Next decision | Next relevant Event OS frontend batch; triage S06B start vs frontend batch ordering |
| Evidence reference | `docs/control/EOS_S06_GATE1_ACCEPTANCE.md`; cumulative register `TDR-S06-004` |

### TDR-S06-005

| Field | Value |
|-------|-------|
| Debt ID | `TDR-S06-005` |
| Current status | `OPEN` |
| Owner | Event OS / AI CTO |
| Severity | `LOW` (authoritative) |
| Affected control or component | Seating consequential-action navigation / pending UX |
| Blocks S06B | `REQUIRES TRIAGE` — NON_BLOCKING for Gate 1; not classified against S06B |
| Blocks S06C | `REQUIRES TRIAGE` |
| Blocks production | `YES` — BLOCKING before production authorisation |
| Required evidence | Launch/adopt/rule lifecycle show explicit progress or retained surface until settlement |
| Acceptance criteria | No unexplained blank transition on consequential actions |
| Compensating control | `UNKNOWN` / `NOT YET CLASSIFIED` beyond Gate 1 observation that capacity correctness was not failed |
| Next decision | Same pending/action-result frontend batch as `TDR-S06-004` |
| Evidence reference | `docs/control/EOS_S06_GATE1_ACCEPTANCE.md`; cumulative register `TDR-S06-005` |

### TDR-S06-006

| Field | Value |
|-------|-------|
| Debt ID | `TDR-S06-006` |
| Current status | `OPEN` |
| Owner | Event OS / AI CTO |
| Severity | `MEDIUM` (authoritative) |
| Affected control or component | Query authorization and list paths (full-snapshot clone) |
| Blocks S06B | `REQUIRES TRIAGE` — not stated as S06B blocker |
| Blocks S06C | `YES` for S06C **scale qualification** (authoritative: required part of EOS-S06C architecture and scale qualification) |
| Blocks production | `REQUIRES TRIAGE` — scale debt; production impact not separately signed beyond S06C requirement |
| Required evidence | Bounded query/list paths without full-snapshot clone; volume latency budgets |
| Acceptance criteria | Architecture/scale qualification under EOS-S06C closes or explicitly accepts residual risk |
| Compensating control | Authentication remediation bounded sign-in write path and home guest-count path only; does **not** close this debt |
| Next decision | Address under EOS-S06C architecture and scale qualification; do not treat auth fix as closure |
| Evidence reference | `docs/control/EOS_AUTH_PERFORMANCE_REMEDIATION_ACCEPTANCE.md`; cumulative register `TDR-S06-006` |

### TDR-S06-007

| Field | Value |
|-------|-------|
| Debt ID | `TDR-S06-007` |
| Current status | `OPEN` |
| Owner | Event OS / AI CTO |
| Severity | `MEDIUM` (authoritative) |
| Affected control or component | `staffSessions` retention / cleanup |
| Blocks S06B | `NO` per current NON_BLOCKING classification — confirm at S06B authority gate |
| Blocks S06C | `REQUIRES TRIAGE` |
| Blocks production | `REQUIRES TRIAGE` |
| Required evidence | Governed expiry/retention policy; cleanup preserves required audit history; no silent mass deletion |
| Acceptance criteria | Policy + safe cleanup path under operational hygiene / scale batch |
| Compensating control | Sessions intentionally not mass-deleted during documentation/acceptance tasks |
| Next decision | Operational hygiene / scale batch; do not mass-delete during docs tasks |
| Evidence reference | `docs/control/evidence/eos-signin-performance-remediation/MEASUREMENT.md`; cumulative register `TDR-S06-007` |

### TDR-S06-008

| Field | Value |
|-------|-------|
| Debt ID | `TDR-S06-008` |
| Current status | `OPEN` |
| Owner | Event OS / AI CTO |
| Severity | `MEDIUM` (authoritative) |
| Affected control or component | Event OS cold-start readiness / snapshot hydration |
| Blocks S06B | `REQUIRES TRIAGE` |
| Blocks S06C | `REQUIRES TRIAGE` — carried into S06C qualification; not classified as hard start-blocker |
| Blocks production | `REQUIRES TRIAGE` |
| Required evidence | Cold-start readiness budget; bounded hydration or progressive readiness |
| Acceptance criteria | Scale / resilience / EOS-S06C qualification addresses or explicitly accepts residual latency |
| Compensating control | `UNKNOWN` / `NOT YET CLASSIFIED` beyond readiness eventually succeeding |
| Next decision | Scale / resilience / EOS-S06C qualification; do not mark closed because authentication was corrected |
| Evidence reference | MD-PR-S080 Gate 1 / auth remediation closure; cumulative register `TDR-S06-008` |

## Summary

| Debt ID | Status | Blocks S06B | Blocks S06C | Blocks production |
|---------|--------|-------------|-------------|-------------------|
| TDR-S06A-001 | OPEN | REQUIRES TRIAGE | REQUIRES TRIAGE | YES |
| TDR-S06-002 | OPEN | NO* | NO* | REQUIRES TRIAGE |
| TDR-S06-003 | OPEN | NO* | NO* | REQUIRES TRIAGE |
| TDR-S06-004 | OPEN | REQUIRES TRIAGE | REQUIRES TRIAGE | YES |
| TDR-S06-005 | OPEN | REQUIRES TRIAGE | REQUIRES TRIAGE | YES |
| TDR-S06-006 | OPEN | REQUIRES TRIAGE | YES (scale qualification) | REQUIRES TRIAGE |
| TDR-S06-007 | OPEN | NO* | REQUIRES TRIAGE | REQUIRES TRIAGE |
| TDR-S06-008 | OPEN | REQUIRES TRIAGE | REQUIRES TRIAGE | REQUIRES TRIAGE |

\*Per current NON_BLOCKING product-acceptance classification; must be reconfirmed at the bounded implementation-authority gate.

## Explicit non-closure

No debt in this register is resolved, accepted, waived or closed.
