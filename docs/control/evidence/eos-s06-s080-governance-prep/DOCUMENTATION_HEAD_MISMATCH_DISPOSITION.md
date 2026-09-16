# Documentation-Head Mismatch Disposition — MD-PR-S080

**Control ID:** `MD-PR-S080`
**Date:** `2026-09-16`
**Disposition ID:** `DISP-S080-DOCS-HEAD-001`
**Live environment variables:** **not modified** by this disposition

## Precise mismatch

Authoritative live posture reported for this governance prep:

| Identity field | Reported value | Role |
|----------------|----------------|------|
| `applicationSha` | `71317881384e38671295c3fda32d533c71c3f559` | Accepted authentication-remediation application identity (`EVENT_OS_GIT_SHA`) |
| `deploymentSourceSha` | `b6a452cde5e4b51a49d13aa47b7b89672fcffffa` | Chronology tip / Railway git commit source after watch-pattern restore rebuild chain |
| `documentationHead` | `0a0be803f123e8326fb893db1e3562c724b70dd0` | `EVENT_OS_DOCS_HEAD` env (prior Gate 1 reviewed application baseline) |

These three identities are **not equal**. The mismatch is between:

1. accepted application identity (`7131788…`),
2. current deployment source / chronology tip (`b6a452c…`),
3. documentation head env still pinned at (`0a0be80…`).

## What this disposition does **not** do

- Does **not** assume the mismatch is harmless.
- Does **not** silently update `documentationHead` / `EVENT_OS_DOCS_HEAD`.
- Does **not** change live environment variables.
- Does **not** rewrite the accepted application SHA.
- Does **not** collapse documentation head into application SHA (forbidden by build-identity contract).

## Cause classification

| Classification option | Assessment |
|-----------------------|------------|
| Intentional lag | **Supported by repository evidence** for the `documentationHead` vs `applicationSha` split: identity maintenance mutated `EVENT_OS_GIT_SHA` only and left `EVENT_OS_DOCS_HEAD` unchanged (`RAILWAY_IDENTITY_MAINTENANCE.md`, `FINAL_IDENTITIES.md`). |
| Configuration defect | **Not proven.** Leaving docs head stale may still be incorrect relative to governing documentation tip; defect vs intentional lag is not fully closed. |
| Promotion failure | **Not proven.** No evidence in this task that a required docs-head promotion was attempted and failed. |
| Unresolved | **Partial.** The three-way divergence (`7131788` / `b6a452c` / `0a0be80`) still lacks a signed owner acceptance that the lag remains correct after chronology tip advanced to `b6a452c`. |

### Recorded classification

| Field | Value |
|-------|-------|
| STATUS | `UNRESOLVED` — intentional non-update of `EVENT_OS_DOCS_HEAD` is evidenced for the auth-identity maintenance step; subsequent chronology tip advance to `b6a452c` has **not** received explicit docs-head disposition |
| REQUIRED ACTION | `OWNER REVIEW` |
| PRODUCTION IMPACT | `BLOCKING UNTIL DISPOSITIONED` |

## Governing documentation source

| Source | Authority |
|--------|-----------|
| Accepted application SHA | `71317881384e38671295c3fda32d533c71c3f559` — controlling for current application identity under MD-PR-S080 auth remediation acceptance |
| Gate 1 historical baseline | `0a0be803…` — retained historical evidence; must not be rewritten as current application identity |
| Chronology / governance tip | `b6a452c…` — controlling tip for watch-pattern and identity chronology documentation at start of this prep |
| `EVENT_OS_DOCS_HEAD` | Optional documentation identity; **never** collapsed into application SHA (`apps/event-os/src/server/build-identity.ts` contract; `IDENTITY_ADDENDUM.md`) |

Governing documentation for programme posture remains the control documents under `docs/control/` at the chronology tip. Live `documentationHead` does **not** automatically equal that tip.

## Remediation or explicit acceptance required

Owner must choose **one** of:

1. **Remediate:** update `EVENT_OS_DOCS_HEAD` under a controlled identity-maintenance change to a signed documentation tip, without conflating it with `applicationSha`; or
2. **Explicitly accept:** record that retaining `documentationHead=0a0be80…` while `applicationSha=7131788…` and `deploymentSourceSha=b6a452c…` is intentional lag with named owner, rationale and expiry/review date.

Until (1) or (2) is recorded, production authorisation remains blocked by this disposition.

## Gate impact

| Gate | Impact |
|------|--------|
| EOS-S06B implementation | `REQUIRES TRIAGE` at bounded S06B implementation-authority gate — not auto-cleared; not proven as an S06B code blocker |
| EOS-S06C implementation | `REQUIRES TRIAGE` at S06C authority gate |
| Production authorisation | `BLOCKING UNTIL DISPOSITIONED` |

## Evidence references

- `docs/control/evidence/eos-s06-gate1-auth-closure/RAILWAY_IDENTITY_MAINTENANCE.md`
- `docs/control/evidence/eos-s06-gate1-auth-closure/FINAL_IDENTITIES.md`
- `docs/control/evidence/eos-s06-gate1-auth-closure/WATCH_PATTERN_CHRONOLOGY.md`
- `docs/control/evidence/eos-s06a-remediation-1/IDENTITY_ADDENDUM.md`
- `docs/control/EOS_AUTH_PERFORMANCE_REMEDIATION_ACCEPTANCE.md`
