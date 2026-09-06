# Event OS Command Atelier

**Authority:** George Lawson, CEO — visual design approval and global Event OS frontend propagation.  
**Repository:** `kglaw-Oluseyi/atelier-doclar` · branch `main`  
**Approved prototype SHA:** `708e6c822120ce23db5dae2b5566f14b0258a2a4`  
**Approval date:** 6 September 2026  
**Starting HEAD for global propagation:** `708e6c822120ce23db5dae2b5566f14b0258a2a4`  
**Status:** Canonical Event OS visual language. Global propagation complete. This is not domain-slice acceptance and not operational production authorisation.

The Command Atelier prototype at `708e6c8` is the approved source of truth. It is now the canonical visual direction for every existing Event OS frontend route. EOS-S04A P08, EOS-S04B and EOS-S05 were not begun. Control Tower and Postgres were not modified or deployed in this task.

## Transition

| Stage | SHA | Meaning |
|-------|-----|---------|
| Rejected elevation reverted | `8d5a80d` | Durable baseline before the prototype |
| Prototype language | `5b42df8` `3a6183d` `4fa3f26` `708e6c8` | Sign-in, shell, Home, guest book, dossier |
| CEO visual approval | `708e6c8` | Canonical direction authorised |
| Global propagation | this commit range | Every existing Event OS frontend route |

## Route inventory and coverage

| Family | Routes | Composition | Coverage |
|--------|--------|-------------|----------|
| Public / root | `/` → sign-in | Redirect | Existing |
| Authentication | `/sign-in` | Ivory chamber on onyx | Prototype + retained |
| Exceptional | `/access-denied`, `/access-pending`, `error`, `not-found` | Onyx chamber + ivory card | Propagated |
| Application overview | `/app` | Executive brief | Prototype + retained |
| Client | `/app/clients`, `/new`, `/[clientId]` | Register / intake / dossier | Propagated |
| Event | `/app/events`, `/new`, `/[eventId]`, `/settings` | Event book / intake / brief / configuration | Propagated |
| Work queue | `/app/my-work` | Assignment queue | Propagated |
| Guest | directory, intake, dossier/addressing | Guest book / intake / dossier | Prototype + intake |
| RSVP staff | `/rsvp`, `/policy`, `/exceptions` | Response book / configuration / review desk | Propagated |
| RSVP guest | `/rsvp`, `/[token]`, `/confirmed`, `/unavailable` | Private correspondence | Propagated |
| Communications | overview, policy, templates, audiences, campaigns, inbox, unmatched, failures, tasks, corrections, audit, messages | Correspondence studio + tab rail | Propagated via frame |
| Access / identity | `/app/admin/access` | Access-control panel | Propagated |
| Audit | `/app/admin/audit` | Executive ledger | Propagated |
| System | `/app/admin/system` | Health ledger | Propagated |

No existing Event OS `page.tsx` was omitted. Inner communications modules inherit the approved masthead and tab rail from `CommunicationsFrame`.

## Component changes

- Shared `AtelierPageHeader` and `AtelierCommsNav` (pathname-selected tabs).
- Shell already carried `at-scope`; foundations now style tables, filters, empty states, correction review, guest RSVP and exceptional chambers globally.
- Radios and ordinary checkboxes received recessed porcelain treatment; filter switches remain physical.
- Communications tabs wrap so every destination stays visible and keyboard-reachable.
- Folio event names use `h2` after the page `h1` to preserve heading order.

## Interaction matrix

Unchanged from the approved prototype: nav translate/brighten + gold thread; primary lift + chevron; secondary tonal fill; tab underline; switch travel; row gold-thread hover; input champagne ring; pointer on enabled actions; `not-allowed` when disabled; text cursor in fields; reduced motion respected.

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (428) |
| `pnpm programme:validate` | PASS — 84 slices, 0 cycles |
| Event OS build | PASS |
| `git diff --check` | PASS |

### Playwright

Complete suite: 26 tests. First long run: 24 passed; 2 failed.

1. `foundation` mobile axe `heading-order` — product defect (folio used `h3` after `h1`). Corrected to `h2`. Isolated rerun PASS.
2. `zz-correction-review` timeout after Next.js `next dev` memory restart while waiting for Communications “Unmatched”. Tabs were also made wrapping so the link remains in flow. Isolated rerun PASS (36s). Classified as infrastructure pressure plus a visibility hardening; not a business-logic failure.

Subsequent isolated reruns: foundation 4/4, correction-review 2/2, atelier 3/3, atelier-global 2/2.

## Evidence (not committed)

Prototype stills: `apps/event-os/test-results/atelier/01-sign-in-desktop.png` … `14-keyboard-focus.png`  
Interaction video: `apps/event-os/test-results/atelier/16-interaction.webm`  
Global families: `apps/event-os/test-results/atelier-global/20-home-desktop.png` through `34-rsvp-unavailable.png`, including 360px Home, directory, communications and audit.

## Unchanged

Business logic, APIs, server actions, schemas, permissions, role grants, audit behaviour, event isolation, optimistic concurrency, authentication, fixtures, routes, `productionAuthorised`, and later slices. Visual surfaces consume existing server-approved projections only.

## Remaining visual debt

- Native `<select>` popup internals remain platform-owned.
- Addressing version-conflict copy still uses the existing action error string.
- Playwright `fullPage` can paint the fixed mobile nav mid-scroll.
- Long `next dev` Playwright suites can restart under memory pressure; isolated reruns are required for judgement.
- Non-Event-OS products (Control Tower) are out of scope.

This visual approval is not production authorisation.
