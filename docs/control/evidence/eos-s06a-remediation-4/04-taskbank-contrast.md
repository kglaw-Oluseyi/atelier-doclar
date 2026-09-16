# EOS-S06A Task Bank contrast correction

**Date:** 2026-09-16  
**Scope:** Task Bank `color-contrast` only — no orchestration/behaviour change.

## Root cause

All Task Bank metadata lines use the shared class `.atelier-command-muted`:

```css
/* before */
.atelier-command-muted { color: rgba(28, 25, 22, 0.72); }
.atelier-command-panel { background: rgba(255, 252, 247, 0.72); }
```

Remediation 4 recorded **79** axe `color-contrast` nodes at 1440 on the Task Bank surface — matching ~2 muted paragraphs × ~40 listed tasks (domain/risk/mode + expected-outcome/tool lines), not 79 unrelated causes.

Shared cause: **one muted text token** (alpha ink) over a **translucent porcelain panel** (and page ivory gradient). Not badges, placeholders, disabled states, or links.

## Before / after

| Token | Before | After |
| --- | --- | --- |
| Muted text | `rgba(28, 25, 22, 0.72)` | `var(--at-umber, #5a534b)` solid |
| Panel background | `rgba(255, 252, 247, 0.72)` | `var(--at-porcelain, #fcfaf7)` opaque |

### Contrast ratios (after, WCAG 2.1 AA)

| Pair | Ratio | Gate |
| --- | ---: | --- |
| `#5a534b` on `#fcfaf7` (panel) | **7.27:1** | ≥ 4.5:1 |
| `#5a534b` on `#f5f0e8` (ivory) | **6.67:1** | ≥ 4.5:1 |
| `#5a534b` on `#efe6d8` (gradient foot) | **6.12:1** | ≥ 4.5:1 |

Visual language preserved: umber/porcelain are existing Atelier onyx–ivory–champagne tokens.

## Affected components

- `.atelier-command-muted` (Task Bank domain/risk/mode lines; outcome/tool lines; also other Atelier Command metadata using the same class)
- `.atelier-command-panel` (Task Bank + sibling Atelier panels)

No Task Bank behaviour, filters, invoke, or permissions changed.

## Validation matrix (filled after deploy)

See `contrast-diag/after-axe-matrix.json` and screenshots `after-taskbank-{1440,768,390}.png`.

## Tests

- `apps/event-os/e2e/eos-s06a-taskbank-contrast.spec.ts`
- Updated `e2e/eos-s06a-remediation-4-a11y.spec.ts` (scoped Task Bank widths; assert 0 contrast violations)

## Identities (filled after deploy)

- Application SHA:
- Documentation HEAD:
- Deployment:
- Runtime: POSTGRES / APPLIED / productionAuthorised:false / providers INACTIVE
- Control Tower: SKIPPED
