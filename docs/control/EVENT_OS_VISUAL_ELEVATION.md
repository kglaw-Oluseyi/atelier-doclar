# Event OS restrained-luxury visual elevation

**Authority:** George Lawson, CEO — visual-system enhancement only.  
**Repository:** `kglaw-Oluseyi/atelier-doclar` · branch `main`  
**Starting HEAD:** `ab1d4245613f889750749209e4a58ab3e605ad69`  
**Implementation commits:** `ebb2c67`, `2610998`, `4b52b7f`  
**This record commit:** recorded after those three commits.  
**Railway / later slices:** not mutated in this record. Push and Event OS deploy remain held until Claude completes verification of `ab1d424`. EOS-S04A P08, EOS-S04B and EOS-S05 were not begun.

## Implementation map (Phase A)

| Area | Finding | Action |
|------|---------|--------|
| Design system | `@maison-doclar/design-system` was a light-only brass palette (`tokens.ts`, `tokens.css`). No theme module. | Semantic tokens, dark/light palettes, theme resolver, cursor/focus/reduced-motion foundations. |
| Event OS styles | `apps/event-os/src/app/globals.css` imported shared tokens and restyled layout classes. Hard-coded treatment used `--md-ink` / `--md-brass`. | Keep class names; map to semantic tokens; elevate shell, forms, tables, buttons, alerts. |
| Theme | None. `color-scheme: light` only. | Blocking init script, persisted toggle, system preference, dark-first fallback. |
| Components | Page-local HTML/CSS classes; no shared React kit. Control Tower uses its own globals and was not restyled. | Central ThemeToggle, PublicChrome, CommunicationsNav selected state. |
| Clickable non-semantics | No decorative clickable `<div>`s. `GuestAccessLink` remains an `<a>`. | Global safe pointer selectors; cards stay non-pointer unless they contain a link. |
| Selectors | Playwright uses roles, labels and `data-testid` (`formal-salutation`, `familiar-name`). | Selectors preserved. |

## Design tokens

Dark (default): page `#0A0A0A`, surface `#141414`, raised `#1A1A1A`, elevated `#242424`, text `#E8E8E8` / `#A8A8A8` / `#666666`, border `rgba(255,255,255,0.08)`.  
Light: page `#F9F8F6`, surface `#FFFFFF`, elevated `#F5F4F2`, text `#1A1A1A` / `#5A5A5A` / `#B0B0B0`, border `rgba(0,0,0,0.08)`.  
Accent: Champagne Gold `#D4AF37` (active only). Light-mode accessible text/focus `#6B5510` to meet 4.5:1. Future Emerald / Midnight Navy / Burnished Copper reserved in tokens, not exposed.  
Legacy `--md-ink`, `--md-paper`, `--md-brass` aliases remain mapped to the semantic set.

## Theme, cursor, accessibility

- Preference order: stored `md-theme` → `prefers-color-scheme` → dark.  
- Toggle: `role="switch"`, name “Dark appearance”, keyboard operable, pointer cursor, persists to `localStorage` and cookie.  
- Enabled actions: `cursor: pointer`. Disabled: `not-allowed`. Text fields: `text`.  
- Focus: 2px `var(--md-focus-ring)`. Reduced motion disables transitions.  
- Display serif: Source Serif 4 via `next/font` for page titles and event names only. Inter remains operational type.

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | PASS (7 packages) |
| `pnpm test` | PASS 436 (design-system 8, shared-platform 152, programme-domain 155, event-os 30, programme-ingestion 46, programme-tower 42, control-tower 3) |
| `pnpm programme:validate` | PASS — 84 slices, 0 cycles |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `git diff --check` | PASS |
| Event OS Playwright (`pnpm e2e`) | 28/28 pass. One long-suite auditor login hit a Next.js memory restart; isolated re-run passed. `PLAYWRIGHT_PROD=1` is not the local token path and was not used for the recorded pass. |
| Screenshots (not committed) | `/tmp/event-os-visual-screenshots/` and `apps/event-os/test-results/visual/` |

## Unchanged

Routes, authentication, server actions, API contracts, schemas, permissions, projections, audit, concurrency, form logic, fixtures and EOS-S04A P03–P07 behaviour. Control Tower and other Railway services were not edited.

## Residual visual / accessibility debt

- Light-mode Champagne Gold is not used as body text; selected navigation uses the darker accessible gold.  
- Future event-level accent themes remain tokens only.  
- Next.js `next dev` can restart under long Playwright suites; not a product defect.
