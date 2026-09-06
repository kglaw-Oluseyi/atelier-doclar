# Event OS Command Atelier premium prototype

**Authority:** George Lawson, CEO — visual prototype of representative Event OS surfaces only.  
**Repository:** `kglaw-Oluseyi/atelier-doclar` · branch `main`  
**Starting HEAD:** `8d5a80d3d0af72c3575618886abd434daee9d577` (`revert(event-os): remove rejected visual elevation`)  
**Implementation commits:** `5b42df8`, `3a6183d`, `4fa3f26`  
**This record:** documents the prototype for CEO visual review. It does not approve the language or authorise global propagation.

Railway / later slices: Event OS deploy in project `atelier-doclar` is authorised for CEO visual review only. Control Tower, Postgres and other services were not deployed. EOS-S04A P08, EOS-S04B and EOS-S05 were not begun. Production remains unauthorised.

## Scope

Prototype only, on real routes and fixtures:

1. Sign-in
2. Authenticated shell and Home
3. Alpha One guest directory
4. Guest dossier and structured-addressing workspace

The staff shell frames all authenticated pages. Inner non-prototype modules keep their existing composition.

## Component system

| Layer | Location | Role |
|-------|----------|------|
| Tokens | `packages/design-system/src/atelier.ts` | Onyx / ivory / champagne-metal palette, motion, editorial type. Original `DESIGN_TOKENS` unchanged (`brass` remains `#b79f85`). |
| Primitives | `packages/design-system/src/atelier.css` | Gold thread, seals, tactile buttons, recessed inputs, tabs, switch, cursors, reduced motion, forced-colours. |
| Composition | `apps/event-os/src/app/atelier.css` | Shell rail, sign-in chamber, executive brief, guest book, dossier. |
| Scope | `.atelier`, `.atelier-shell`, `.at-scope` | Prevents indiscriminate restyle of every Event OS module. |
| Tabs | `apps/event-os/src/components/atelier-section-tabs.tsx` | In-page section rail; no routing or authority change. |

Editorial type: Instrument Serif via `next/font` (`--font-editorial`) for titles and ceremonial names only. Inter remains operational.

## Visual rationale

Two-material composition: onyx navigation frame, warm ivory work surface. Champagne metal is a fine thread (active rail, editorial rule, primary fill), never body text and never `#D4AF37`. Oxblood is reserved for destructive/link hover. Home uses a dark espresso brief on a luminous workspace so the product is not an uninterrupted black canvas. Cards vary by purpose: event brief, attention strip, numerical folio, guest-book row, dossier panel.

This is not the rejected charcoal / bright-gold elevation. There is no theme toggle.

## Interaction / motion matrix

| Control | Default | Hover | Focus-visible | Active | Selected | Disabled |
|---------|---------|-------|---------------|--------|----------|----------|
| Nav item | Muted porcelain | Brighten + 3px translate | Champagne outline | — | Gold-thread rail | — |
| Primary button | Champagne metal + chevron | 2px lift, warmer highlight, chevron shift | Champagne ring | Compress | — | `not-allowed`, no motion |
| Secondary button | Porcelain + hairline | Fill + 1px lift | Champagne ring | — | — | `not-allowed` |
| Tabs | Quiet pill rail | Tonal fill | Distinct outline | — | Porcelain + metallic underline | — |
| Guest row | Flat porcelain | Warm shift + gold-thread inset | Focus-within thread | — | — | — |
| Switch | Recessed track | Halo | Outline | Thumb travels | Champagne track | — |
| Inputs | Recessed porcelain | — | Champagne edge + ambient ring | — | — | — |
| Text links | Ink | Oxblood | Outline | — | — | — |

Motion: 200ms controls, 280ms panels, ease `cubic-bezier(0.22, 1, 0.36, 1)`. Shell enters with a brief opacity/translate. `prefers-reduced-motion` removes non-essential movement. Pointer only on actionable elements; text fields keep `text`.

## Technical verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (design-system 3, shared-platform 152, programme-domain 155, event-os 27, programme-ingestion 46, programme-tower 42, control-tower 3) |
| `pnpm programme:validate` | PASS — 84 slices, 0 cycles |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `git diff --check` | PASS |

## Playwright

Local token path (`event-os-access-token-not-for-production`). `PLAYWRIGHT_PROD=1` was not used.

| Spec | Result |
|------|--------|
| `foundation.spec.ts` | PASS |
| `guests.spec.ts` | PASS |
| `addressing.spec.ts` | PASS |
| `zz-staff-session.spec.ts` | PASS |
| `atelier.spec.ts` | PASS (axe desktop + 360px, reduced motion, 200% zoom, cursors, tabs, switch, validation, version conflict) |

Business assertions were not weakened.

## Evidence (not committed)

| Item | Path |
|------|------|
| Sign-in desktop | `apps/event-os/test-results/atelier/01-sign-in-desktop.png` |
| Home desktop | `apps/event-os/test-results/atelier/02-home-desktop.png` |
| Guest directory desktop | `apps/event-os/test-results/atelier/03-guest-directory-desktop.png` |
| Guest dossier desktop | `apps/event-os/test-results/atelier/04-guest-dossier-desktop.png` |
| Guest directory 360px | `apps/event-os/test-results/atelier/05-guest-directory-360.png` |
| Guest dossier 360px | `apps/event-os/test-results/atelier/06-guest-dossier-360.png` |
| Navigation hover | `apps/event-os/test-results/atelier/07-navigation-hover.png` |
| Guest-row hover | `apps/event-os/test-results/atelier/08-guest-row-hover.png` |
| Primary-button hover | `apps/event-os/test-results/atelier/09-primary-button-hover.png` |
| Tab selected/hover | `apps/event-os/test-results/atelier/10-tab-selected-hover.png` |
| Toggle state | `apps/event-os/test-results/atelier/11-toggle-state.png` |
| Addressing validation | `apps/event-os/test-results/atelier/12-addressing-validation.png` |
| Version conflict | `apps/event-os/test-results/atelier/13-version-conflict.png` |
| Keyboard focus | `apps/event-os/test-results/atelier/14-keyboard-focus.png` |
| Interaction recording | `apps/event-os/test-results/atelier/16-interaction.webm` |

## Unchanged

Business logic, server actions, API contracts, schemas, permissions, role grants, audit behaviour, event isolation, optimistic concurrency, fixture identities, routing, authentication, `productionAuthorised`, existing backend tests, and EOS-S04A domain behaviour. Visual surfaces consume existing server-approved projections. Home guest counts are live `listGuests` reads inside try/catch; no fabricated intelligence.

## Known shortcomings

- Non-prototype inner pages (clients, communications, RSVP centre, admin) inherit the shell frame only; their content composition is unchanged until CEO approval.
- Native `<select>` menus remain browser-owned beyond the recessed trigger.
- Addressing version-conflict copy currently surfaces the existing action error (`expected version N but found M`) rather than the public PlatformError sentence; presentation is styled, behaviour is unchanged.
- Playwright `fullPage` screenshots can paint the fixed mobile nav mid-scroll; live mobile keeps it on the bottom safe area.
- Next.js development overlay may appear in local evidence; production does not include it.

## Status

Prototype deployed for CEO visual approval. Global propagation not started. Design is not approved by this record.
