# CAP600 Live Verification Bridge

**Date:** 2026-09-16  
**Edition:** `eos-s06-capacity-600-v1`  
**Qualification evidence commit:** `5561171261f3c193136a0b3be5dbd504a2ed8f70`  
**Prior Claude verdict:** Preserved as **BLOCKED** (first attempt)  
**Stage 1 disposition:** `CAP600 READY FOR CLAUDE`

## Purpose

Install a controlled, clearly labelled synthetic CAP600 event on Railway Event OS production so independent verification can resume against the accepted Gate 1 identity — without repurposing `EOS-S06-CUR-20260915T173901 Seating`.

## Accepted profile (must match)

| Metric | Value |
|--------|-------|
| Code | `CAP600` |
| Name | `[SYNTHETIC QUALIFICATION] Capacity Qualification 600` |
| Guests | 600 |
| Tables | 63 (42×10 + 18×8 + 3×12) |
| Seats | 600 |
| Corpus hashes | See `ACCEPTED_CAP600_CORPUS_HASHES` (must not drift) |

## Live fixture identity (immutable)

| Field | Value |
|-------|-------|
| Immutable event ID | `053fa686-124e-49b3-b8a8-d0497c0a1668` |
| Code | `CAP600` |
| Name | `[SYNTHETIC QUALIFICATION] Capacity Qualification 600` |
| Edition | `eos-s06-capacity-600-v1` |
| Guests / tables / seats | **600 / 63 / 600** |
| Profile | **42×10 · 18×8 · 3×12** |
| Duplicate guest IDs | **0** |
| Duplicate table object IDs | **0** |
| Layout validation | `blockingCount=0`, `unresolvedBlockingCount=0`, `publicationBlocked=false` (1 warning) |
| Synthetic label | Present (`data-synthetic-qualification=true`) |
| Discoverable via Events search | Yes (`CAP600` / capacity / 600) |
| Install manifest | `manifest.json` |
| Stage 1 verify-only | `verify-only-manifest.json` / `stage1-closure.json` |

## Roles granted (event-scoped)

| Role | Person | Assignment ID |
|------|--------|---------------|
| CEO | George Lawson | `b4ca382c-6877-454e-bb7b-48b72ad32ecb` |
| Event Director | Amara Okonkwo | `0be11de9-37f2-4fda-9b6d-1e5aff7cfb2a` |
| Planner | James Whitfield | `5d450438-788f-46cc-a60b-78475567672c` |
| Read-Only Auditor | Priya Nair | `0034893f-e90d-4026-bd80-84e9fcf6ce38` |

Org-wide CEO/Auditor assignments remain; event-scoped grants make Access Administration list the verification cast.

## Stage 1 browser smoke (short; not Claude’s ten journeys)

Recorded in `stage1-browser-smoke.out` — **3 passed (1.6m)** against live application SHA `0a0be803f123e8326fb893db1e3562c724b70dd0`:

1. CEO finds CAP600 via Events search, opens exact event ID, seating studio/inputs/rules/runs load; Cap043 found.
2. System Health programme posture shows **EOS-S06A ACCEPTED (MD-PR-S079)** with Gate 1 awaiting independent verification; `productionAuthorised false`.
3. Read-Only Auditor cannot mutate (no constraint form / Save rule / Activate binding / Publish); Planner lacks director-only Activate binding and Publish seating plan.

## CAP1000 (out of Stage 1 scope)

Event `3d212906-529e-4bd8-b13f-b0c2a24e5fba` remains:

**`INCOMPLETE — INSTALLATION PAUSED — NOT FOR VERIFICATION`**

Do not describe, verify, or expose it as a completed CAP1000 qualification. It must not be mistaken for CAP600.

## Installer (reference only)

```bash
# Verify (read-only replay of existing live CAP600)
railway run --service event-os -- pnpm exec tsx apps/event-os/scripts/s06-capacity-live-install.ts \
  --fixture CAP600 --confirm-synthetic-qualification --verify-only
```

Safety: exact Railway project `atelier-doclar` / production / event-os; `productionAuthorised:false`; providers inactive; refuses corpus hash drift. Ephemeral `s06-capacity-600-seed.ts` Railway refusal remains intact.

## Claude handoff

Exact resumption prompt: `docs/control/evidence/eos-s06-gate1-live-bridge-claude/CLAUDE_VERIFICATION_PROMPT.md`
