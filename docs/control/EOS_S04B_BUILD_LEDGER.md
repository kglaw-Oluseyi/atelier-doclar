# EOS-S04B Cumulative Build Ledger

**Authority:** EOS-S04B implementation authority (George Lawson, CEO) — `MD-PR-S018`  
**Created:** 2026-09-07  
**Status:** OPEN — first complete vertical in progress; slice not ACCEPTED  
**Production:** `productionAuthorised=false`; protected gates remain UNSIGNED / `NOT_READY`  
**Railway:** project `atelier-doclar` only, under `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md`

## Starting baseline

| Field | Value |
|-------|-------|
| HEAD | `40d65fa97fc9f2f0424757b7abd27872c0644f21` |
| Branch | `main` |
| origin/main | identical |
| Worktree | clean |
| Repository | `kglaw-Oluseyi/atelier-doclar` |

## P00 — Controlled reconnaissance

Read-only. No product code changed in the ratification commit.

### Requirements map (first vertical)

| Requirement | Disposition |
|-------------|-------------|
| Default single-phase / one-day | IMPLEMENT — auto-create one `ProgrammePhase` per `eventId` |
| Same-day multi-phase | IMPLEMENT — additional phases with overlap acknowledgement |
| Multi-day programme days | IMPLEMENT — `ProgrammeDay` grouping |
| Phase entitlement without duplicating guest | IMPLEMENT — `PhaseEntitlement` references existing `guestId` |
| Arrival routes and checkpoints | IMPLEMENT — gate, parking, venue; independent decisions |
| VIP fast-track as routing only | IMPLEMENT — discreet marker; verification still required |
| Vehicle / driver association | IMPLEMENT — vehicle is not occupant identity |
| Signed offline projection | IMPLEMENT — versioned HMAC package; not an attendance ledger |
| Slice 8 scanner / attendance writer | EXCLUDE — no-duplication law |
| FaceGate / biometrics / payments / S05 | EXCLUDE |
| EOS-S03 invitation quantity | PRESERVE — phase eligibility cannot invent seats |
| EOS-S04A party / person identity | PRESERVE — parties never substitute for guestId |

### Risks carried into implementation

| Risk | Control |
|------|---------|
| Double-counting across phases | Distinct-person union helper; never sum phase counts |
| Route revealing security-sensitive detail | Projection redaction; auditor/minimum-necessary fields |
| Credential reuse across events | Event-scoped presentation reference; fail closed on mismatch |
| Offline package staleness | Version + valid-until + supersession; consume fails closed |
| Fast-track bypassing verification | Routing flag cannot skip checkpoint verification policy |

## Prompt account (this milestone)

The CEO overlay authorises continuous execution through the first complete deployable vertical. Focused commits are at engineering boundaries, not a stop after each pack prompt number. Academy delta (P10) and whole-slice independent-review package (P11) are **not** this milestone.

## First complete vertical — 2026-09-07

| Commit | SHA | Boundary |
|--------|-----|----------|
| Ratification / control records | `bbf75b6c99c664940f5c35a2456b05e956b197f6` | MD-PR-S018 authority overlay |
| Contracts, persistence, services, fixtures | `3eac4d191405df4b35c85a4f9c95695f376fb977` | shared-platform |
| Event OS Command Atelier workspace | `f1142af08069dca8c860ffb9a6098cb5555981f7` | frontend / server actions |
| Unit, Postgres-memory and Playwright | `c6bde2d5b75e1e40ec50036d000fd5f0999060fc` | tests |

Starting baseline: `40d65fa97fc9f2f0424757b7abd27872c0644f21`.

### First-run product failures (corrected in-batch)

1. Offline consume of a superseded package with stale `expectedVersion` is `VERSION_CONFLICT`, not `VALIDATION_FAILED`.
2. Playwright `getByText("Estate main gate")` matched SVG, type option and checkpoint option.
3. `getByRole("heading", { name: "Perimeter" })` also matched the page title.
4. `resolveCheckpointAction` caught Next.js `redirect()` and rendered a false server-failure state.
5. Railway `next build` rejected `result` as possibly undefined after `programmeFail` (local tsc did not).
6. Replay `seedCatalogue()` rewrote accepted permission bodies at version 1 and failed closed on Railway Postgres. Replay now inserts missing catalogue rows only.

### Gates

- `pnpm typecheck` PASS (8 packages)
- `pnpm test` PASS: academy 7, design-system 3, shared-platform 199, programme-domain 155, programme-ingestion 46, event-os 45, programme-tower 42, control-tower 3 (500 pass / 0 fail)
- `pnpm programme:validate` PASS (84 slices, 0 cycles)
- `pnpm --filter @maison-doclar/event-os build` PASS (`/app/events/[eventId]/programme` present)
- `git diff --check` clean
- Playwright `e2e/s04b-vertical.spec.ts` PASS after in-batch locator and redirect fixes

### Not started

EOS-S04C, EOS-S04D, EOS-S04E, EOS-S04F, EOS-S05. Academy P10 and whole-slice P11 are outside this milestone. Control Tower was not changed.
