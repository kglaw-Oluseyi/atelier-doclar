# EOS-S05A Build Ledger

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S040`
**Starting baseline for MD-PR-S040:** `934e91e74324fb5aed2a7ebb8de129b12af782f8`
**Application/test SHA:** `5aca600d98430f224849ee18f5075e83c47eafa7`
**Status:** `IMPLEMENTED / NOT ACCEPTED`
**Production:** unauthorised
**Catalogue accepted-slice count:** remains 5
**Implemented range:** `EEC-00`–`EEC-44` implemented; `EEC-45` not Cursor acceptance
**EOS-S06:** `NOT_STARTED / NOT_AUTHORISED`

## Units

| Unit | Title | Status |
|------|-------|--------|
| EEC-00–EEC-10 | Foundation | COMPLETE |
| EEC-11–EEC-14 | Brief, client sign-off, conversion, workbench | COMPLETE |
| EEC-15–EEC-25 | Budget Engine, Studio, client investment | COMPLETE |
| EEC-26–EEC-32 | Calendar roadmap and client timeline | COMPLETE |
| EEC-33–EEC-36 | Fixture AI and change adapters | COMPLETE |
| EEC-37–EEC-40 | Interview corpus, evaluation, Event Command | COMPLETE |
| EEC-41–EEC-44 | Assurance evidence | COMPLETE as implementation; Claude deferred |
| EEC-45 | Acceptance | NOT_APPLICABLE |

## First-run failures

| Command | Classification | Root cause | Correction | Rerun |
|---------|----------------|------------|------------|-------|
| Client projection after S040 schema | Implementation defect (S040) | `clientInvestmentProjection` still referenced removed `envelope` | Use `envelopeAction` | Focused tests pass |
| Calendar instantiate assertion | Test defect (S040) | Service returns the edition, not `{ edition, milestones }` | Assert on edition plus workspace milestones | Completion tests pass |
| `pnpm typecheck` unused symbols | Implementation defect (S040) | Replaced interview script left unused locals | Remove dead script and unused import | `tsc` pass |
| Local Playwright sign-in | Environment defect (S040) | Parent-shell access token did not match the fixture server | Run local E2E with the fixture token | Responsive and whole-slice pass |
| `PLAYWRIGHT_PROD=1` / `next start` | Environment defect (S040) | Production runtime requires `DATABASE_URL` | Use Next.js dev with a larger heap | Local E2E pass |
| Local whole-slice timeout | Tooling defect (S040) | Next.js restarted at the memory threshold; staff nav click after the decide-change banner stayed on Discovery | Direct `/app/command` navigation, 360s timeout, `--max-old-space-size=8192` | Whole-slice 1.1m pass; responsive 18s pass |

S038/S039 first-run failures remain historical in prior commits and are not reopened.

## Carried debt

| ID | Note |
|----|------|
| TDR-S05A-001 | CLOSED — private object path |
| TDR-S05A-002 | CLOSED — enquiry owner/stage/close |
| TDR-S05A-003 | CLOSED — executable evaluation corpus against the fixture boundary |
| TDR-S05A-004 | CLOSED — dedicated client investment route |
| TDR-S05A-005 | CLOSED — configuration-driven Lagos working calendar |

## Final-SHA gates (application/test SHA `5aca600d98430f224849ee18f5075e83c47eafa7`)

| Gate | Result |
|------|--------|
| EOS-S05A focused platform tests (30) | PASS |
| Evaluation/red-team corpus | PASS — fixture runner, zero-tolerance recorded |
| Client token / Brief / Budget / calendar / change / Command / private-object tests | PASS (included in focused + package suites) |
| `pnpm typecheck` | PASS |
| `pnpm --filter @maison-doclar/shared-platform test` | 360 pass / 0 fail |
| `pnpm --filter @maison-doclar/event-os test` | 80 pass / 0 fail |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `git diff --check` | PASS |
| Local whole-slice / responsive E2E | PASS — whole-slice 1.1m; responsive 18.3s at 360 / 768 / 1440 / 200% zoom |
| Live whole-slice / responsive E2E | PASS — 2 passed in 46.3s on `https://event-os-production-bc8d.up.railway.app` |

## Deployment

Event OS only. Control Tower was not deployed (recent Control Tower rows remain `SKIPPED`).

| Field | Value |
|-------|-------|
| Upload deploy | `63178182-b7e1-40ae-8a76-59d138dcc1ea` SUCCESS (superseded by SHA stamp) |
| Live deploy | `42b3f98b-7a4b-431d-9270-41b1286133be` SUCCESS |
| GitHub / live SHA | `eb1463bacb670549fab272f657eddbfbf220f746` |
| `alive` / `ready` | true |
| Persistence / migrations | `POSTGRES` / `APPLIED` |
| `productionAuthorised` | false |
| Layout store / export | READY / READY |
| Interview corpus | `s05a-interview-v2` |
| Evaluation | `UNRUN` (truthful; fixture corpus passed locally; live has no executed run) |
| Evaluation blocked | false |
| Calendar | READY |

Deployment is not acceptance.
