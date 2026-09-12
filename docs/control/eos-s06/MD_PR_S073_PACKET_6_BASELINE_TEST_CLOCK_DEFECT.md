# MD-PR-S073 Packet 6 — Baseline test-clock defect

**Authority:** `docs/control/eos-s06/MD_PR_S073_EOS_S06_V2_LIVE_COMMAND_SETTLEMENT_AND_PROCESS_ISOLATION.md`  
**Authority SHA-256:** `9e527f289b71c5d794f472bf271839799a042916985b1eda288028b8709537ff`  
**Classification:** baseline test-infrastructure defect discovered during Packet 6. Not an EOS-S06 seating defect and not a production token-policy change.

## Proof it reproduces at the required baseline

Checked out `3edd535321016d4d4542839274d37772eb699a52` (detached) and reran the failing files. Restored `main` afterwards.

| File | Result at `3edd535` |
|---|---|
| `packages/shared-platform/test/eec-intelligence.test.ts` | 6 pass, 1 fail — `EEC-12 client confirmation and token isolation` |
| `packages/shared-platform/test/s05b-s063-dossier-repository.test.ts` | 8 pass, 1 fail — `issues hashed grants, records client messages, and revokes immediately` |

The same wall-clock comparison also fails these two tests on current HEAD before the clock correction (same root cause, same files as the remaining Packet 6 failures):

- `client review edition sign-off is hash-bound and does not approve the brief` — `eec-s05a-completion.test.ts`
- `client investment lineage does not approve a staff budget` — `eec-s05a-completion.test.ts`
- `no-repeat interview, correction lineage and token revoke` — `eec-s05a-depth.test.ts`

## Traced functions

| Step | Discovery | Dossier |
|---|---|---|
| Issue grant | `PlatformService.issueDiscoveryClientAccess` → `issueDiscoveryClientAccessOnSnap` | `RiskDossierCommandService.issueClientAccess` → `decideGrantIssue` |
| Calculate `expiresAt` | `actor.now ?? new Date()` plus seven days | `nowOf(actor)` (`actor.now ?? new Date()`) plus seven days |
| Validate expiry | `resolveDiscoveryClientAccess` via `expiresAt <= now` | `assertGrantUsable` → `resolveGrantStatus` via `expiresAt <= now` |
| Token-path `now` before correction | `new Date().toISOString()` in `getClientDiscoveryProjection`, `recordClientBriefDecisionByToken`, review/investment/interview/consent-by-token | `new Date().toISOString()` default on `resolveClientSession` and `recordClientMessageByToken` |

Staff issue used the frozen actor instant `2026-09-05T15:00:00.000Z`. Token validation used the real UTC clock. After `2026-09-12T15:00:00.000Z` the seven-day grants were expired.

## Existing clock abstractions

`EvaluationClock` in `eec-evaluation-fixtures.ts` is an evaluation-fixture helper (`now(): string`). It is not a service-composition clock and was not reused.

No production `PlatformClock` existed. The smallest shared contract was added: `PlatformClock` / `systemClock` in `packages/shared-platform/src/platform-clock.ts`.

## Correction

- Production composition (`apps/event-os/src/server/runtime.ts`) sets `clock: systemClock`.
- Test composition (`fixtureService`, dossier command constructors) injects a fixed clock at `2026-09-05T15:00:00.000Z`.
- Direct `new Date()` was replaced only on discovery/dossier token issue, expiry calculation, validation, revoke and renewal paths.
- Token duration, hash binding, organisation/event isolation, revocation and `failedExchangeCount >= 8` are unchanged.
