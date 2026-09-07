# EOS-S04F Build Ledger

**Slice ID:** `EOS-S04F`  
**Prompt Control ID:** `MD-PR-S026`  
**Starting baseline:** `2663f4363ad311f486f05c70e8e8411d5e9830bb`  
**Status:** `IN_PROGRESS` (implementation ledger; not acceptance)  
**Production:** unauthorised  
**Next slices:** EOS-S05 not started; not authorised by this overlay

## P00 — Controlled reconnaissance

Ratification overlay `EOS_S04F_RATIFICATION.md` and canonical mapping `EOS_S04F_CANONICAL_RECORD_MAPPING.md`. HEAD was `2663f4363ad311f486f05c70e8e8411d5e9830bb` on `main`.

| Area | Reuse | Extension | New | Exclusion |
|------|-------|-----------|-----|-----------|
| Event / assignment / permission | Core Event OS | Language permission keys | — | No new global staff roles |
| Invitation / RSVP | S03 | Recipient identity only | — | No RSVP mutation |
| Guest identity / addressing | S04A | Approved rendering only | Language profiles | No inference from name or household |
| Programme / merchandise / forecast | S04B–D | — | — | No operational rewrite |
| Communications | S04 | Assembly preview only | — | No dispatch or provider |
| Private Atelier | S04E | Host multilingual edition | — | No parallel Atelier ledger |
| Persistence | Snapshot + receipts | — | S04F collections + `EOS-S04F-LANGUAGE-V1` | No wholesale snapshot serialization |
| Academy | ACA-S04A–E contracts | Course-id union | ACA-S04F | Completion never grants authority |
| Control Tower | Compatibility only | — | — | Not a deploy target |

**STOP condition:** none. Continue through P11.

## P01–P05 — Contracts, persistence, services, permissions

`language-unicode.ts`, `language-placeholders.ts`, `language-schemas.ts`, `language-operations.ts`, `language-persistence.ts`, `language-migration.ts`, `language-projections.ts`, `language-fixtures.ts`, store/service wiring. Backend proof: `language-unicode.test.ts`, `language-journeys.test.ts`, `language-persistence.test.ts`.

First-run language journeys: inference was applied too broadly to content-work titles; the check now runs only on preference and assembly, before `parseStrict`. Unicode NFD fixture used an invented string; the test now uses `composed.normalize("NFD")`. After those ordinary test/contract fixes: 13/13 language tests passed.

## P06–P09 — Staff workspace, host edition, E2E

Staff `/app/events/[eventId]/language`. Host EDITIONS chapter may project an approved host-facing multilingual edition. Playwright `s04f-vertical.spec.ts` and `s04f-responsive-a11y.spec.ts`.

## P10–P11 — Academy, hardening, independent review

ACA-S04F registered at `/app/academy/ACA-S04F` and `/app/academy/aca-s04f`. Thresholds 80 / 90. Completion grants no linguistic approval, role, campaign authority, provider access, gate signature or production authorisation. Independent verification prompt: `EOS_S04F_CLAUDE_IN_CHROME_VERIFICATION.md`. Claude verifies; Claude does not accept.

## Verification commands

Workspace `pnpm typecheck`, `pnpm test`, `pnpm programme:validate`, `pnpm --filter @maison-doclar/event-os build` and `git diff --check` are recorded in `EOS_S04F_IMPLEMENTATION.md`.
