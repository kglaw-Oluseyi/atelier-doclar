# EOS-S05 Build Ledger

**Slice ID:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028`  
**Starting baseline:** `bb705588e0d4481802658a18d7666e28e3a18fea`  
**Status:** `IN_PROGRESS` — Milestone 1 implementation; not accepted  
**Production:** unauthorised  
**Next slices:** EOS-S06 not authorised; Milestone 2–4 not released

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

**STOP condition:** none at reconnaissance. Continue through Milestone 1 only.

## Verification

Workspace `pnpm typecheck`, `pnpm test`, `pnpm programme:validate`, `pnpm --filter @maison-doclar/event-os build`, Event OS Playwright `s05-venue-vertical` / `s05-responsive-a11y`, and `git diff --check` are recorded in `EOS_S05_IMPLEMENTATION.md`.

Deployment of Event OS to Railway project `atelier-doclar` is implementation evidence only. It is not EOS-S05 acceptance and not production authorisation.
