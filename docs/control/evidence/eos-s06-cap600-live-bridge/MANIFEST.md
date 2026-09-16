# CAP600 Live Verification Bridge

**Date:** 2026-09-16  
**Edition:** `eos-s06-capacity-600-v1`  
**Qualification evidence commit:** `5561171261f3c193136a0b3be5dbd504a2ed8f70`  
**Prior Claude verdict:** Preserved as **BLOCKED** (first attempt)

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

## Installer

```bash
# Dry-run
railway run --service event-os -- pnpm exec tsx apps/event-os/scripts/s06-capacity-live-install.ts \
  --fixture CAP600 --confirm-synthetic-qualification --dry-run

# Install / replay
railway run --service event-os -- pnpm exec tsx apps/event-os/scripts/s06-capacity-live-install.ts \
  --fixture CAP600 --confirm-synthetic-qualification

# Verify
railway run --service event-os -- pnpm exec tsx apps/event-os/scripts/s06-capacity-live-install.ts \
  --fixture CAP600 --confirm-synthetic-qualification --verify-only
```

Safety: exact Railway project `atelier-doclar` / production / event-os; `productionAuthorised:false`; providers inactive; refuses corpus hash drift. Ephemeral `s06-capacity-600-seed.ts` Railway refusal remains intact.

## Live fixture identity

Filled after post-deploy install:

| Field | Value |
|-------|-------|
| Immutable event ID | _(post-deploy)_ |
| Replay | _(post-deploy)_ |

## Roles granted (event-scoped)

- George Lawson — CEO  
- Amara Okonkwo — Event Director  
- James Whitfield — Planner  
- Priya Nair — Read-Only Auditor  

Org-wide CEO/Auditor assignments remain; event-scoped grants make Access Administration list the verification cast.
