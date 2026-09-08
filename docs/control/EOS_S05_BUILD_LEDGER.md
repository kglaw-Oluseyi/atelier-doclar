# EOS-S05 Build Ledger

**Slice ID:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028` / `MD-PR-S029`
**Starting baseline:** `bb705588e0d4481802658a18d7666e28e3a18fea`
**Milestone 2 starting SHA:** `a7dc4d931f3c01f05354b11e68bc7c4a155e5afb`
**Authority commit:** `cee64f6f69bfc6dace53ffc60d8232e6938653de`
**Platform commit:** `bd65c02e790082ea2d46e1323a848c42446e512a`
**Event OS commit:** `e4ec11712c7f4fb3db0b3f4e6afc4b6ebc02c8b8`
**Milestone 2 platform commit:** `446113bad699849fd9f92d7d37d09d94ac762b8c`
**Milestone 2 Event OS commit:** `82c758978d08e59018f539e399efda2c24733bfb`
**Status:** `IN_PROGRESS` — Milestones 1–2 implemented; not accepted
**Production:** unauthorised  
**Next slices:** EOS-S06 not authorised; Milestone 3–4 not released

## Milestone 1 — Authority, venue foundation and spatial contract

Historic traceability: `S5-01`–`S5-13` / `MD-PR-0232`–`MD-PR-0244`. Status of those historic units remains `NOT_EXECUTED`. Their substantive requirements are implemented through this milestone.

| Area | Reuse | Extension | New | Exclusion |
|------|-------|-----------|-----|-----------|
| Organisation / client / event | Core Event OS hierarchy | Venue visibility and adoption checks | — | No Tenant or parallel identity ledger |
| Person / assignment / permission | Existing roles and capability keys | `venue.*` and `layout.*` keys | No new system role | Historic Venue Liaison labels remain descriptions |
| RSVP / forecast / provision | Read adapter only | Typed attendance projection | — | No capacity calculation; no source mutation |
| Persistence | Snapshot + receipts | — | S05 collections + `EOS-S05-VENUE-LAYOUT-V1` | No destructive down-migration |
| Frontend | Command Atelier | Org venues + event venue/layout | Structured setup, not canvas | No Konva truth; no guest placement |
| Assets | None approved | Metadata-only evidence contract | Designed unavailable upload | No fake scanning or signed URLs |

**STOP condition:** none at reconnaissance. Milestone 1 remains closed for reopening without regression evidence.

## Milestone 2 — Typed spatial objects and complete authoring vertical

Historic traceability: `S5-14`–`S5-27` and `S5-31`–`S5-38` / `MD-PR-0245`–`MD-PR-0269` except S5-28–S5-30. Those historic units remain `NOT_EXECUTED`. S5-28–S5-30 binary asset processing stays in Milestone 3 because `TDR-S05-001` is unresolved.

| Area | Decision |
|------|----------|
| Canvas | Typed SVG projection of persisted objects. Konva was not added so the canvas cannot become a parallel JSON blob. |
| Commands | One `applyLayoutCommand` path for canvas, inspector and keyboard. |
| Objects | Zone, table, seat, fixture, route, safe/restricted/clearance areas, annotation, group. |
| Assets | Binary floor-plan upload remains unavailable. |

## Verification

Workspace `pnpm typecheck`, `pnpm test`, `pnpm programme:validate`, `pnpm --filter @maison-doclar/event-os build`, Event OS Playwright `s05-venue-vertical` / `s05-responsive-a11y` / `s05-studio-vertical`, and `git diff --check` are recorded in `EOS_S05_IMPLEMENTATION.md`.

Deployment of Event OS to Railway project `atelier-doclar` is implementation evidence only. It is not EOS-S05 acceptance and not production authorisation.
