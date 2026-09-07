# EOS-S04B accessibility and responsive remediation

**Authority:** MD-PR-S018. This record is evidence for final acceptance. It does not accept the slice.  
**Date:** 2026-09-07  
**Repository:** `kglaw-Oluseyi/atelier-doclar` · `main`  
**Starting SHA:** `5fd7fbda224699b1d820de1aa8b3876f8594da5a`  
**Railway:** project `atelier-doclar`, service `event-os` only. Control Tower was not changed.  
**Production:** `productionAuthorised` remains `false`.

Claude independently passed deployment truth, Postgres, CEO/Planner/Auditor journeys, forged requests, concurrency, persistence, keyboard, reduced motion, semantics, and secret absence against the starting SHA. Those journeys were not repeated.

## Defects remediated

1. Approved decorative champagne `#B89A62` measured **2.36:1** against ivory `#F5F0E8`, below WCAG 1.4.11’s 3:1 requirement wherever that colour identified a control boundary or focus state.
2. Deterministic viewport and 200% zoom evidence was missing as Playwright contexts with recorded dimensions.

## Token changes

Decorative champagne is unchanged. A darker semantic token is used only for functional light-surface indicators.

| Token | Hex | Role |
|-------|-----|------|
| `ATELIER_TOKENS.color.champagne` / `--at-champagne` / `--at-accent-decorative` / `--at-focus-dark` | `#B89A62` | Approved decorative thread; dark-surface focus and selected nav |
| `ATELIER_TOKENS.color.champagnePale` / `--at-champagne-pale` | `#D8C59C` | Decorative pale thread on onyx |
| `ATELIER_TOKENS.color.champagneFunctional` / `--at-champagne-functional` / `--at-accent-functional` / `--at-focus-light` | `#8B6E38` | Functional light-surface accent |
| `--at-champagne-functional-rgb` | `139, 110, 56` | Focus glow alpha |

`ATELIER_ACCENT.decorative` and `ATELIER_ACCENT.functionalLight` alias the same values.

## Measured contrast ratios

WCAG relative luminance, `(L1 + 0.05) / (L2 + 0.05)`.

| Pair | Ratio | Threshold | Result |
|------|------:|-----------|--------|
| Functional `#8B6E38` on ivory `#F5F0E8` | **4.22:1** | 3:1 non-text | PASS, comfortably above |
| Functional `#8B6E38` on porcelain `#FCFAF7` | **4.60:1** | 3:1 non-text | PASS |
| Functional `#8B6E38` on parchment `#EAE1D4` | **3.70:1** | 3:1 non-text | PASS |
| Decorative `#B89A62` on onyx `#11100F` | **7.09:1** | 3:1 non-text | PASS |
| Pale `#D8C59C` on onyx `#11100F` | **11.21:1** | 3:1 / 4.5:1 text | PASS |
| Decorative `#B89A62` on espresso `#1B1815` | **6.60:1** | 3:1 non-text | PASS |
| Umber `#5A534B` on ivory `#F5F0E8` | text AA | 4.5:1 | PASS |
| Ink `#191714` on ivory `#F5F0E8` | text AA | 4.5:1 | PASS |
| Decorative `#B89A62` on ivory `#F5F0E8` | **2.36:1** | n/a decorative | not used for functional light-surface indicators |

Functional champagne is a non-text UI token. Shared CSS does not use it as `color`. Accent text continues to use ink, umber, oxblood, or pale champagne on onyx.

## Affected functional selectors

Shared language (`packages/design-system/src/atelier.css`):

- `.at-scope :focus-visible` and `.at-switch:focus-visible` — `--at-focus-light`
- `.at-scope .form input|select|textarea:focus-visible` and filter-bar equivalents — border and glow
- `.at-tabs [aria-current|aria-selected="true"]::after` — selected tab indicator
- `.at-scope input[type="checkbox"]:checked` and `input[type="radio"]:checked` — selected boundary
- `.at-switch:checked` — selected track
- `.at-scope .button.secondary:hover` — hover boundary
- `.at-seal[data-tone="brass"]::before` and `.md-status[data-tone="brass"]::before`
- `.at-scope .alert` inset bar

Event OS surfaces (`apps/event-os/src/app/atelier.css`):

- `.atelier-attention` left rule
- `.atelier-guest-row` / data-table row hover and focus-within thread
- `.atelier-guest .guest-choice:hover|:focus-within`
- `.atelier-state[data-tone="warn"]` inset
- `.atelier-academy-authority` and `.atelier-academy-progress button[aria-current="step"]`

Dark-surface overrides retain decorative champagne:

- `.atelier-shell .nav :focus-visible`, `.mobile-nav :focus-visible`, `.atelier-featured :focus-visible`, `.programme-bead :focus-visible`
- Current nav thread, mobile current underline, decorative `.at-thread`, primary button fill, loading mark

Perimeter SVG now scales inside `.programme-perimeter-figure` with `preserveAspectRatio="xMidYMid meet"` and a wrapping numbered legend for long checkpoint names.

## Tests

- `packages/design-system/test/contrast.test.ts` — calculated contrast contract; fails if a required functional pair drops below 3:1.
- `apps/event-os/e2e/s04b-responsive-a11y.spec.ts` — explicit contexts at 360×800, 768×1024, 1440×900, 1440×900 with CSS `zoom: 2`, and 720×450 (1440 at 200% layout equivalent, matching the repository’s documented Playwright limitation).

Evidence (not committed): `apps/event-os/test-results/eos-s04b-responsive/`.

### Viewport measurements (Playwright Chromium contexts)

| Context | Viewport | clientWidth × clientHeight | scrollWidth | overflowX | cssZoom |
|---------|----------|----------------------------|------------:|----------:|---------|
| Mobile | 360 × 800 | 360 × 800 | 360 | 0 | 1 |
| Tablet | 768 × 1024 | 768 × 1024 | 768 | 0 | 1 |
| Desktop | 1440 × 900 | 1440 × 900 | 1440 | 0 | 1 |
| 1440 at CSS zoom 2 | 1440 × 900 | 1440 × 900 | 1440 | 0 | 2 |
| 720 layout equivalent of 1440 @ 200% | 720 × 450 | 720 × 450 | 720 | 0 | 1 |

Vertical scroll only. Ordinary operation did not require two-dimensional page scrolling.

## First-run notes

- Unit contrast suite: one regex false positive on `border-color`; fixed in-batch. Subsequent design-system run 8/8 PASS.
- Playwright first run: 4/4 PASS. CSS zoom was then reapplied after navigations so zoom screenshots are distinct from desktop.

## Unchanged

EOS-S04C, EOS-S04D, EOS-S04E, EOS-S04F, EOS-S05. Business logic, routing, permissions, schemas and API contracts. Control Tower.
