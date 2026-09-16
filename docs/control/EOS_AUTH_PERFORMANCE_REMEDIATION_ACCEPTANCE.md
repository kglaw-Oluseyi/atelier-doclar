# Event OS Authentication Performance Remediation — Formal Acceptance

**Product:** `EVENT_OS`
**Prompt Control ID:** `MD-PR-S080`
**Title:** Sign-in performance remediation acceptance
**Mode:** Governance / acceptance record
**Date:** `2026-09-16`
**Decision authority:** `ChatGPT / AI CTO`

```text
Authentication performance remediation
Status: ACCEPTED — SIGN-IN PERFORMANCE RESTORED
Accepted application SHA: 71317881384e38671295c3fda32d533c71c3f559
Railway deployment at remediation: 815dea7a-9ece-4165-be33-a7c9e5abb640
Source: 71317881384e38671295c3fda32d533c71c3f559
Acceptance date: 2026-09-16
```

## Decision

`ACCEPTED — SIGN-IN PERFORMANCE RESTORED`

## Historical Gate 1 reviewed baseline (not rewritten)

Claude’s Gate 1 verification and the prior reviewed Gate 1 application baseline remain:

`0a0be803f123e8326fb893db1e3562c724b70dd0`

Do not retroactively rewrite that SHA in Gate 1 historical evidence. The authentication remediation SHA `7131788…` becomes the current accepted application identity under MD-PR-S080.

## Initial defect

Warm sign-in was approximately **32–36 seconds**.

## Root cause

1. Authentication used full `snapshot()` / `replace()` behaviour and scanned or compared unrelated collections.
2. Protected `/app` performed N+1 `listGuests` snapshot clones (one per assigned event).

Evidence: `docs/control/evidence/eos-signin-performance-remediation/MEASUREMENT.md`.

## Remediation implemented

- Bounded authentication transaction via `StaffAuthCapableStore.applyStaffAuthMutation`.
- Identity / session / audit-only mutation boundary.
- Single-view home guest-count correction (`viewSnapshot()`; stop N+1 full clones).
- Pending sign-in experience (`PendingSubmit`, `aria-live`, disabled inputs).

## Measured timings (AI CTO acceptance basis)

| Metric | Value |
|--------|-------|
| Warm sign-in p50 | 276 ms |
| Warm sign-in p95 | 867 ms |
| Warm sign-in max | 867 ms |
| Authenticated navigation commit p50 | ~1,007 ms |
| Protected DOM | ~2–14 ms |
| Volume behaviour | Flat / bounded at 50, 600, 1,000 and 2,000 guests |
| Authentication document writes | At most three |

## Security invariants preserved

- Server-side credential verification preserved.
- HMAC / session binding preserved.
- HttpOnly cookie behaviour preserved.
- Authentication issue, denial, revocation and audit preserved.
- No credential logging.
- No role expansion.
- CAP600 unchanged.
- Production safety posture unchanged (`productionAuthorised:false`, providers inactive).

## Deployment identity

| Field | Value |
|-------|-------|
| Remediation Railway deployment | `815dea7a-9ece-4165-be33-a7c9e5abb640` |
| Source / accepted application SHA | `71317881384e38671295c3fda32d533c71c3f559` |
| Commits (lineage) | `04438ca` bounded auth write; `66e713a` home clone fix; `7131788` measurement evidence |

## Explicit limits

- Accepting this remediation does **not** close `TDR-S06-006` (full-clone query paths remain on other list/authorize paths).
- Accepting this remediation does **not** authorise production, providers, EOS-S06B, EOS-S06C or EOS-S07.
