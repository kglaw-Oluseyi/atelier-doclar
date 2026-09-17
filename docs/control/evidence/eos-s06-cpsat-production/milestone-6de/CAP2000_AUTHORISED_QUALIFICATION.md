# CAP2000 — newly authorised qualification (post A2 polarity fix)

**Status:** **`PASS — STRESS/CONTAINMENT`** (qualification evidence only; not adopted)
**Date:** 2026-09-17
**Authorised after:** CAP1000 A2 polarity fix on `95e500b` + evidence `149ea74`
**Worker image:** `event-os-solver-worker:m6e-a2fix-737d932`

## Relation to the prior CAP2000 execution

The prior-session CAP2000 run `384950a6-a49d-4321-803b-346f0d65c061` on event
`92909476-d3f9-43f1-a5f7-7e1a83c92fbd` remains permanently
**`UNAUTHORISED AFTER CAP1000 STOP — INADMISSIBLE FOR QUALIFICATION`**.

This note and `CAP2000_REPORT.json` **do not supersede, rehabilitate, or reclassify**
that historical disposition. They record a **separate, newly authorised** run with a
fresh event id and a fresh run id. The inadmissible run was not reused.

| | Inadmissible prior | This authorised run |
|---|---|---|
| Event | `92909476-…` | `c2a0a001-2026-0917-a2fx-cap2000auth01` |
| Run | `384950a6-…` | `4c7c4f5e-576e-40a0-85c4-d6831cc79d3d` |
| Disposition | INADMISSIBLE | PASS — STRESS/CONTAINMENT (new) |

## Corpus / identity

- **Seed:** `scale-2000` (programme qualification shard; 2000 guests / 2000 seats / 200 tables)
- **configHash:** `7403c97b4d487fa1ed7805a1b23cd1d3a47e491c692648e49abc1df0daf220e0`
- **compiledRequestHash:** `2cc7617db7c62fd6d042500e2040cef07ec48b5dea87a12388180f20d0d5ad11`
- **Finding:** there is **no** `seating-capacity-2000-layout-fixture.ts` (or equivalent
  CAP2000 product layout corpus). Live install codes are CAP600|CAP1000 only.

## Path used (and why)

1. **Product layout-install attempted first.**
   `s06-capacity-live-install.ts --fixture CAP2000` refused immediately:
   `--fixture must be CAP600 or CAP1000 (got CAP2000)`.
   No OOM occurred — the path cannot start without a CAP2000 fixture/guards.
2. **Fell back to durable enqueue** of the locked `scale-2000` synthetic compiled
   request against the live Railway worker (same solver-child settlement path as CAP1000
   bypass).

**Open item (carry forward):** product layout-install + guest intake at 2000 guests
remains **unqualified**. This CAP2000 evidence is **solver-path-only**.

## Result (not adopted)

- Lifecycle: `READY_FOR_REVIEW`
- productResult: `OPTIMAL`
- evidenceGrade: `OPTIMAL_PROOF`
- Seated: 2000/2000 unique guests and positions
- Solve wall ≈ 3s (within doc 08 typical ≤60s / hard ≤180s)
- Baseline adoption `3b771ad9-…` unchanged (`CURRENT`); candidate not adopted
