# EOS-S06C Focused UX and Programme-Posture Remediation

**Disposition:** READY FOR CLAUDE UX RECHECK — **not accepted**  
**Date:** 2026-09-16  
**Application SHA:** `d30643ca5ad347014d3a9a9457f2228783916540`  
**Deployment:** `f0c37946-7210-4f6c-869f-89c157e74488`  
**Deployment source SHA:** `d30643ca5ad347014d3a9a9457f2228783916540`  
**Documentation HEAD (lag):** `0a0be803f123e8326fb893db1e3562c724b70dd0`  
**Git HEAD:** `d30643ca5ad347014d3a9a9457f2228783916540`

## Scope corrected

1. Guest-directory desktop column overlap / crowding  
2. Mobile caption character-staircase wrapping  
3. Attention-only control/label collision  
4. Completed-intake Valid/Warnings/Invalid misleading zeros  
5. System Health heading-order accessibility  
6. System Health programme posture (S06B/C/D/S07)

Ingestion semantics, fixtures, roles, providers and `productionAuthorised:false` unchanged.

## Root cause — CSS / layout

| Defect | Cause | Fix |
|--------|-------|-----|
| Mobile caption one glyph per line | Inherited `overflow-wrap: anywhere` / `word-break: break-word` from `.atelier-shell .data-table` on caption with letter-spacing | Guestbook overrides to `overflow-wrap: break-word; word-break: normal`; caption `white-space: normal` |
| Desktop cell/header crush | Later `.atelier-shell .data-table { width:100%; table-layout:fixed }` + `max-width:100%` on table/wrap defeated earlier guestbook `min-width`, forcing nine columns into ~960px | Higher-specificity `.atelier-shell .atelier-guestbook .data-table { width:max(100%,72rem); min-width:72rem; max-width:none }` with `table-wrap { overflow-x:auto }` |
| Attention label collision | Switch track (44px) without reserved margin; label text sat against control | Explicit `htmlFor`/`id`, label `span`, `margin-right:1rem`, fixed 44px flex basis |
| Long cell values | Fixed layout without clip strategy | `.guestbook-cell-clip` ellipsis + native `title` for full value |

## Counter semantics

After promotion, `summariseProgress` recounts `rowsValid` from candidate statuses (`READY`/`WARNING`). Promoted rows are `PROMOTED`, so Valid/Warnings/Invalid become `0` even when 1,000 rows validated.

**Presentation fix only** (`validationCounterDisplay`): for terminal COMPLETED jobs where validation counters are all zero but settled/promoted work exists, show an honest “not retained after promotion” notice. Do **not** invent Valid totals. Reconciliation receipt remains authoritative (`Source rows: 1000`, `Created: 1000`).

## Programme posture

`formatProgrammePostureLine()` now includes:

- EOS-S06B: CEO RATIFIED — PLANNING ONLY; implementation not authorised  
- EOS-S06C: IMPLEMENTED — AWAITING AI CTO ACCEPTANCE  
- EOS-S06D: CEO RATIFIED — PLANNING ONLY; implementation not authorised  
- EOS-S07: NOT_STARTED / NOT_AUTHORISED  

## Accessibility

System Health: `Release evidence` demoted from skipped `h3` under `h1` to `h2`; historical block `h3`. Live axe: directory / intake / system serious+critical `0`; `heading-order` `0`.

## Screenshots

| File | Viewport |
|------|----------|
| `screenshots/guest-directory-360.png` | 360 — filters + Attention only |
| `screenshots/guest-directory-360-caption.png` | 360 — caption wraps as words |
| `screenshots/guest-directory-768.png` | 768 — card layout |
| `screenshots/guest-directory-1280.png` | 1280 — scrollable table |
| `screenshots/intake-receipt-1280.png` / `360.png` | completed counters honesty |
| `screenshots/system-health-1280.png` | posture + headings |

## Fixture integrity (read-only)

| Fixture | Count |
|---------|-------|
| Exact CAP1000 `add41e21-…` | 1000 |
| CAP600 `053fa686-…` | 600 |
| Old partial CAP1000 `3d212906-…` | 125 |
| Mixed `af4a6b7e-…` | 1050 |

## Changed files

- `apps/event-os/src/app/atelier.css`  
- `apps/event-os/src/app/app/events/[eventId]/guests/page.tsx`  
- `apps/event-os/src/components/hv-intake-progress.tsx`  
- `apps/event-os/src/server/hv-intake-validation-counters.ts`  
- `apps/event-os/src/server/programme-posture.ts`  
- `apps/event-os/src/components/protection-release-evidence.tsx`  
- `apps/event-os/test/hv-intake-validation-counters.test.ts`  
- `apps/event-os/test/gate1-live-bridge-ui.test.ts`  
- `apps/event-os/e2e/eos-s06c-ux-remediation.spec.ts`  
- `apps/event-os/e2e/guests.spec.ts` (strict-mode `.first()` hardening)

## Focused tests

- Unit: validation counters + programme posture — pass  
- Typecheck — pass  
- Local `guests.spec.ts` — pass  
- Live `eos-s06c-ux-remediation.spec.ts` — pass (`BROWSER_RESULTS.json`)  
- `git diff --check` — clean  
- Secret/PII scan — 0 hits  

## Safety

`productionAuthorised:false` · providers INACTIVE · Control Tower untouched · S06B/S06D/S07 not started · fixtures not mutated
