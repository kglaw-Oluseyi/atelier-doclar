# Claude-in-Chrome — EOS-S06C UX Recheck (focused)

**Copy-ready. Do not remediate. Do not accept. Return PASS / PASS WITH CONTROLLED OBSERVATIONS / FAIL / BLOCKED.**

## Identities

- Application SHA: `d30643ca5ad347014d3a9a9457f2228783916540`
- Deployment: `f0c37946-7210-4f6c-869f-89c157e74488`
- Deployment source SHA: `d30643ca5ad347014d3a9a9457f2228783916540`
- Documentation HEAD: `0a0be803f123e8326fb893db1e3562c724b70dd0` (lag; do not conflate)
- Live URL: `https://event-os-production-bc8d.up.railway.app`
- Exact CAP1000 event: `add41e21-9618-44f9-896a-fecd54badca5` / job `28a5370a-6700-4ac0-88a8-a716026ed860`
- `productionAuthorised`: false · providers inactive

## Hard exclusions

- Do not mutate CAP600 `053fa686-…`, old partial CAP1000 `3d212906-…`, or mixed 1050 event `af4a6b7e-…`
- Do not re-run full intake qualification
- No repository remediation; no acceptance claim

## Journeys (corrected surfaces only)

1. Sign in via staff adapter.
2. Open exact CAP1000 guest directory.
3. At **360px**: confirm caption “EVENT-SCOPED OPERATIONAL GUEST RECORDS” wraps as **words**, not characters; guest cards readable; Attention only toggle has clear gap from label; label click toggles control; focus visible.
4. At **768px** and **1280px**: confirm no overlapping cell text; table may scroll horizontally; truncated values expose full text via `title`/accessible name; search/filters remain usable; keyboard Tab shows visible focus.
5. Open completed intake job `28a5370a-…`: confirm Valid/Warnings/Invalid are **not** shown as misleading zeros; honest “not retained” (or equivalent) notice; reconciliation receipt still shows 1000 source / 1000 created.
6. Open System Health: confirm programme posture includes S06B planning-only, S06C IMPLEMENTED — AWAITING AI CTO ACCEPTANCE, S06D planning-only, S07 NOT_STARTED; heading order sensible (no skip from h1 to h3).
7. Confirm CAP1000 still 1000, CAP600 still 600, old partial 125, mixed 1050 (read-only).

## Required return

Classification + short journey table. Do not claim EOS-S06C accepted.
