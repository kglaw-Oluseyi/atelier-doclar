# EOS-S06A Task Bank contrast correction

**Date:** 2026-09-16  
**Scope:** Task Bank `color-contrast` only — no orchestration/behaviour change.  
**Claude:** not run.

## Root cause

All Task Bank metadata lines use the shared class `.atelier-command-muted`:

```css
/* before */
.atelier-command-muted { color: rgba(28, 25, 22, 0.72); }
.atelier-command-panel { background: rgba(255, 252, 247, 0.72); }
```

Remediation 4 recorded **79** axe `color-contrast` nodes at 1440 on the Task Bank surface — matching ~2 muted paragraphs × ~40 listed tasks (domain/risk/mode + expected-outcome/tool lines). Live after-fix Task Bank still has **152** muted metadata nodes (76 tasks × 2) — one shared token, not 79 independent styles.

Shared cause: **one muted text token** (alpha ink) over a **translucent porcelain panel**. Not badges, placeholders, disabled states, or links.

## Before / after

| Token | Before | After |
| --- | --- | --- |
| Muted text | `rgba(28, 25, 22, 0.72)` | `var(--at-umber, #5a534b)` → computed `rgb(90, 83, 75)` |
| Panel background | `rgba(255, 252, 247, 0.72)` | `var(--at-porcelain, #fcfaf7)` → computed `rgb(252, 250, 247)` |

### Contrast ratios (after, WCAG 2.1 AA normal text)

| Pair | Ratio | Gate |
| --- | ---: | --- |
| `#5a534b` on `#fcfaf7` (panel) | **7.27:1** | ≥ 4.5:1 |
| `#5a534b` on `#f5f0e8` (ivory) | **6.67:1** | ≥ 4.5:1 |
| `#5a534b` on `#efe6d8` (gradient foot) | **6.12:1** | ≥ 4.5:1 |

Visual language preserved: umber/porcelain are existing Atelier onyx–ivory–champagne tokens.

## Affected components

- `.atelier-command-muted` (Task Bank domain/risk/mode + outcome/tool lines; other Atelier Command metadata sharing the class)
- `.atelier-command-panel` (Task Bank + sibling Atelier panels)

No Task Bank behaviour, filters, invoke, permissions, plans, or audit logic changed.

## Exact axe matrix (live, scoped Task Bank, `color-contrast` rule)

| Width | Violations (nodes) | Incomplete (axe undetermined, e.g. pseudo) |
| ---: | ---: | ---: |
| 1440 | **0** | 497 |
| 768 | **0** | 520 |
| 390 | **0** | 522 |

Incomplete entries are axe `pseudoContent` / undetermined background cases — **not** recorded as violations and not silenced via rule exclusion.

Screenshots: `contrast-diag/after-taskbank-{1440,768,390}.png`  
Pre-fix reference: `contrast-diag/before-1440.png`

## Reflow / keyboard / focus / pointer / reduced-motion

- No horizontal overflow of Task Bank at 1440/768/390 (bounding box ≤ viewport).
- `#atelier-command-q` receives keyboard focus.
- Use-task control retains interactive cursor.
- `prefers-reduced-motion: reduce` keeps Task Bank visible.
- 200% zoom-equivalent (`zoom:2` at 720px) keeps Task Bank visible.
- Workspace queue + Executive Ledger still load; workspace/ledger scoped `color-contrast` violations: **0**.

## Tests

- `apps/event-os/e2e/eos-s06a-taskbank-contrast.spec.ts` — PASS live
- Queue/audit smoke — PASS live
- `git diff --check` — clean

## Identities

| Surface | Value |
| --- | --- |
| Application / docs / source SHA | `7f139a556f7c023efa98daccd7bfd29481a05775` |
| Railway deployment | `8cb7645f-e4e6-4bdf-8aaa-6e7a0f18e7fc` SUCCESS |
| Runtime | POSTGRES · APPLIED · productionAuthorised:false · providers INACTIVE |
| Control Tower | SKIPPED (`355a6332-8d8e-44d0-a8b4-2c575a374719`) |

## Status

- EOS-S06A remains **NOT ACCEPTED**
- EOS-S07 **NOT_STARTED / NOT_AUTHORISED**
- Claude **not run**
