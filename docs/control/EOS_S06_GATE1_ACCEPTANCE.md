# EOS-S06 Pre-Production Gate 1 Formal Acceptance

**Slice / gate:** `EOS-S06` Pre-Production Gate 1 — 600-Guest Capacity Qualification
**Product:** `EVENT_OS`
**Prompt Control ID:** `MD-PR-S080`
**Title:** Gate 1 Acceptance, Authentication Remediation Acceptance, Application Identity Maintenance, and Successor Pack Registration
**Mode:** Governance / acceptance record
**Date:** `2026-09-16`
**Decision authority:** `ChatGPT / AI CTO`

```text
EOS-S06 Pre-Production Gate 1
Status: ACCEPTED — PASS WITH CONTROLLED OBSERVATIONS
Acceptance ID: MD-PR-S080
Prior Gate 1 reviewed application baseline: 0a0be803f123e8326fb893db1e3562c724b70dd0
Accepted authentication-remediation application SHA: 71317881384e38671295c3fda32d533c71c3f559
CAP600 immutable event ID: 053fa686-124e-49b3-b8a8-d0497c0a1668
Acceptance date: 2026-09-16
```

This record accepts **Pre-Production Gate 1 only**. It does **not** authorise production. It does **not** activate providers. It does **not** start EOS-S06B, EOS-S06C or EOS-S07. CAP1000 remains incomplete and is **outside** Gate 1 acceptance.

## 1. Scope and authority

| Field | Value |
|-------|-------|
| Repository | `kglaw-Oluseyi/atelier-doclar` |
| Branch | `main` |
| Starting `origin/main` | `71317881384e38671295c3fda32d533c71c3f559` |
| Railway project | `atelier-doclar` |
| Environment | `production` |
| Service | `event-os` only |
| Control Tower | Untouched |
| `productionAuthorised` | `false` |
| Providers / communications | `INACTIVE` |
| Data posture | Synthetic only |
| Decision | `ACCEPTED — PASS WITH CONTROLLED OBSERVATIONS` |

## 2. Starting evidence and application identities

| Identity | SHA / ID |
|----------|----------|
| Previous accepted/reviewed Gate 1 application baseline | `0a0be803f123e8326fb893db1e3562c724b70dd0` |
| New AI CTO-accepted authentication-remediation application SHA | `71317881384e38671295c3fda32d533c71c3f559` |
| Claude Gate 1 verification application baseline (historical; not rewritten) | `0a0be803f123e8326fb893db1e3562c724b70dd0` |
| CAP600 live bridge evidence | `docs/control/evidence/eos-s06-cap600-live-bridge/` |
| Focused capacity suite evidence | `docs/control/evidence/eos-s06-capacity-600/` |

Do not retroactively rewrite the SHA used for Claude’s Gate 1 verification. Keep `0a0be80…` in historical Gate 1 evidence. The authentication remediation SHA `7131788…` is the current accepted application identity after MD-PR-S080.

## 3. CAP600 immutable event identity

| Field | Value |
|-------|-------|
| Event ID | `053fa686-124e-49b3-b8a8-d0497c0a1668` |
| Event code | `CAP600` |
| Event name | `[SYNTHETIC QUALIFICATION] Capacity Qualification 600` |
| Edition | `eos-s06-capacity-600-v1` |

## 4. Exact 600 / 63 / 600 reconciliation

| Measure | Value |
|---------|------:|
| Synthetic guests | 600 |
| Tables | 63 |
| Seats | 600 |
| Unique placements | 600 |
| Missing guests | 0 |
| Duplicate guests | 0 |
| Over-capacity tables | 0 |

## 5. Exact table profile

| Capacity | Count |
|---------:|------:|
| 10 | 42 |
| 8 | 18 |
| 12 | 3 |

## 6. Automated qualification summary

- Focused capacity suite: **15/15**.
- Live FEASIBLE solver result on exact CAP600 fixture.
- Deterministic capacity scenarios cover multiple constraints and deliberately infeasible cases.
- Server-side authority enforcement evidenced.
- Responsive and keyboard evidence retained under capacity-600 browser evidence.

## 7. PostgreSQL persistence

Live CAP600 bridge and production readiness confirm persistence `POSTGRES` with migrations `APPLIED`. CAP600 remains durable on the live Event OS production database under the immutable event ID above.

## 8. Concurrency

Disaggregated two-event concurrency timings retained under `docs/control/evidence/eos-s06-capacity-600/concurrency-timing.jsonl`.

## 9. Replay and recovery

Idempotent replay and verify-only recovery evidenced by the live bridge (`--verify-only` / replay path) against event `053fa686-…`.

## 10. Browser / accessibility evidence

- Capacity-600 browser journeys retained.
- Stage 1 live bridge browser smoke: 3/3 passed.
- Claude’s partial Journeys 7 and 9 are supplemented by focused automated and Cursor browser evidence for Planner and Read-Only Auditor restrictions.

## 11. Claude independent-verification verdict

**Second attempt (exact CAP600 live):** `PASS WITH CONTROLLED OBSERVATIONS`.

Claude verified. Claude did not accept. ChatGPT / AI CTO issued the Gate 1 acceptance decision under `MD-PR-S080`.

Archival summary: `docs/control/evidence/eos-s06-gate1-auth-closure/CLAUDE_GATE1_INDEPENDENT_VERIFICATION.md`.

## 12. Claude journey matrix (recorded)

| Attempt | Fixture condition | Verdict |
|---------|-------------------|---------|
| First | CAP600 not live / identity blocked | `BLOCKED` — preserved |
| Second | Exact live CAP600 `053fa686-…` | `PASS WITH CONTROLLED OBSERVATIONS` |

Both independent attempts are preserved as history. The original BLOCKED report/evidence is **not** rewritten or removed:

- `docs/control/evidence/eos-s06-gate1-verification-blocker-remediation/`

## 13. Evidence limitations

Claude’s live feasible run contained **no active custom HARD rule**. Automated deterministic capacity scenarios cover multiple constraints and deliberately infeasible cases. This is recorded as an **evidence limitation**, not a capacity correctness failure.

## 14. Controlled observations

See technical debt entries opened under MD-PR-S080 (`TDR-S06-004` … `TDR-S06-008`) and retained `TDR-S06A-001`. Observations do not overturn Gate 1 capacity correctness on the exact CAP600 fixture.

## 15. Technical-debt references

| ID | Status |
|----|--------|
| `TDR-S06A-001` | OPEN (retained) |
| `TDR-S06-002` | OPEN / NON_BLOCKING (retained) |
| `TDR-S06-003` | OPEN / NON_BLOCKING (retained) |
| `TDR-S06-004` | OPEN — rule-save pending state |
| `TDR-S06-005` | OPEN — consequential-action blank transition |
| `TDR-S06-006` | OPEN — full-clone query paths |
| `TDR-S06-007` | OPEN — staff-session accumulation |
| `TDR-S06-008` | OPEN — cold boot full-snapshot hydration |

No prior debt is silently closed by this acceptance.

## 16. Deployment and watch-pattern truth

Gate 1 acceptance itself is a governance action. Application identity maintenance and documentation push protection are recorded in `docs/control/evidence/eos-s06-gate1-auth-closure/`. Watch-pattern chronology distinguishes documentation-push protection from identity-variable configuration-maintenance rebuilds. Configuration-maintenance rebuilds are not claimed as “no deployment.”

## 17. Explicit non-authorisations

- This accepts **Pre-Production Gate 1 only**.
- This does **not** authorise production.
- This does **not** activate providers or communications.
- This does **not** start EOS-S06B, EOS-S06C or EOS-S07.
- CAP1000 remains **incomplete** and **outside** Gate 1 acceptance.
- Catalogue accepted-slice count remains **6** (unchanged).

## Review ruling

**EOS-S06 PRE-PRODUCTION GATE 1: ACCEPTED — PASS WITH CONTROLLED OBSERVATIONS**
**PRODUCTION AUTHORISED: NO**
**EOS-S06B / EOS-S06C / EOS-S07 IMPLEMENTATION AUTHORISED: NO**
