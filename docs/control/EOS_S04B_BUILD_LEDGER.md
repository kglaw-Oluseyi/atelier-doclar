# EOS-S04B Cumulative Build Ledger

**Authority:** EOS-S04B implementation authority (George Lawson, CEO) — `MD-PR-S018`  
**Created:** 2026-09-07  
**Status:** OPEN — first complete vertical in progress; slice not ACCEPTED  
**Production:** `productionAuthorised=false`; protected gates remain UNSIGNED / `NOT_READY`  
**Railway:** project `atelier-doclar` only, under `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md`

## Starting baseline

| Field | Value |
|-------|-------|
| HEAD | `40d65fa97fc9f2f0424757b7abd27872c0644f21` |
| Branch | `main` |
| origin/main | identical |
| Worktree | clean |
| Repository | `kglaw-Oluseyi/atelier-doclar` |

## P00 — Controlled reconnaissance

Read-only. No product code changed in the ratification commit.

### Requirements map (first vertical)

| Requirement | Disposition |
|-------------|-------------|
| Default single-phase / one-day | IMPLEMENT — auto-create one `ProgrammePhase` per `eventId` |
| Same-day multi-phase | IMPLEMENT — additional phases with overlap acknowledgement |
| Multi-day programme days | IMPLEMENT — `ProgrammeDay` grouping |
| Phase entitlement without duplicating guest | IMPLEMENT — `PhaseEntitlement` references existing `guestId` |
| Arrival routes and checkpoints | IMPLEMENT — gate, parking, venue; independent decisions |
| VIP fast-track as routing only | IMPLEMENT — discreet marker; verification still required |
| Vehicle / driver association | IMPLEMENT — vehicle is not occupant identity |
| Signed offline projection | IMPLEMENT — versioned HMAC package; not an attendance ledger |
| Slice 8 scanner / attendance writer | EXCLUDE — no-duplication law |
| FaceGate / biometrics / payments / S05 | EXCLUDE |
| EOS-S03 invitation quantity | PRESERVE — phase eligibility cannot invent seats |
| EOS-S04A party / person identity | PRESERVE — parties never substitute for guestId |

### Risks carried into implementation

| Risk | Control |
|------|---------|
| Double-counting across phases | Distinct-person union helper; never sum phase counts |
| Route revealing security-sensitive detail | Projection redaction; auditor/minimum-necessary fields |
| Credential reuse across events | Event-scoped presentation reference; fail closed on mismatch |
| Offline package staleness | Version + valid-until + supersession; consume fails closed |
| Fast-track bypassing verification | Routing flag cannot skip checkpoint verification policy |

## Prompt account (this milestone)

The CEO overlay authorises continuous execution through the first complete deployable vertical. Focused commits are at engineering boundaries, not a stop after each pack prompt number. Academy delta (P10) and whole-slice independent-review package (P11) are **not** this milestone.
