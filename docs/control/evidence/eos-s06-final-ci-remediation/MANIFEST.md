# EOS-S06 — Final CI Remediation

**Not acceptance.** EOS-S06 remains unaccepted pending AI CTO review. EOS-S07 remains unstarted.

## Identities

| Role | Value |
|------|-------|
| Starting HEAD | `9eeed2433e0ae55415f4af6d4e602f04b2952858` |
| Failed CI run (billing cleared) | `34960952874` / job `104367985331` |
| Failing test | `apps/event-os/test/seating-trusted-action-boundary.test.ts` — subtest 13/14 |

## Root-cause classification

**PRODUCT BOUNDARY**

`recoverProposeSeatingLayoutBindingAction` authenticated with a direct `requireActor()` call and manually re-derived event/assignment authority outside `runTrustedSeatingAction` / the Packet 2 trusted seating context. That bypassed the canonical “authenticate once via trusted context” boundary and tripped the Packet 2 static assertion `seatingActions.includes("requireActor()") === false`.

This was not a stale test. The recovery endpoint is legitimate, but it must share the same trusted-context establishment path as propose/activate/withdraw.

## Security invariant retained

- Authenticate exactly once (`requireActor` only inside `establishTrustedSeatingContext`).
- Derive organisation / event / assignment authority from trusted server state + `boundEventId`.
- Never accept authority or scope from FormData (FormData used only for idempotency key + scope tripwire).
- Fail-closed: unauthenticated / forbidden / missing receipt → inline unconfirmed transport failure (no false SUCCESS).
- Idempotent recovery: durable receipt lookup by idempotency key; REPLAYED result when already APPLIED/REPLAYED.

## Correction

- Extracted `establishTrustedSeatingContext` in `trusted-seating-action-context.ts`.
- `runTrustedSeatingAction` and `recoverProposeSeatingLayoutBindingAction` both use it (single auth).
- Removed `requireActor` import/use from `seating-actions.ts`.
- Strengthened Packet 2 assertions: recover must call `establishTrustedSeatingContext`; must not take org/event from FormData.

## Focused validation

| Gate | Result |
|------|--------|
| `seating-trusted-action-boundary.test.ts` | pass |
| `s06-mutation-recoverable.test.ts` | pass |
| `seating-v2-mutation-503-idempotency.test.ts` | pass |
| Event OS unit tests | 143/143 pass |
| Repository `pnpm typecheck` | pass |
| `git diff --check` | pass |

## Deployment / CI

| Role | Value |
|------|-------|
| Ending HEAD / application commit | `233afaaf8c3ee6eeca96914657f3af6041867c40` |
| Event OS deployment | `228bd93a-5016-4ab4-a7b0-20d6173607c7` SUCCESS |
| Deployed SHA | `233afaaf8c3ee6eeca96914657f3af6041867c40` |
| Live posture | ready · POSTGRES · APPLIED · `productionAuthorised:false` · providers INACTIVE |
| Control Tower | not deployed (SKIPPED listings) |
| Focused live propose smoke | pass |

### Formal CI — run `34966947067`

URL: https://github.com/kglaw-Oluseyi/atelier-doclar/actions/runs/34966947067  
Started `2026-09-15T12:06:21Z` · ended `2026-09-15T13:26:52Z` · conclusion **cancelled** (canceled by `@kglaw-Oluseyi`).

| Step | Result |
|------|--------|
| Checkout / install / Typecheck | success |
| Test (includes trusted-boundary fix) | success |
| Programme validate / project / ingest / reconcile | success |
| Production build | success |
| Install Playwright Chromium | success |
| Control Tower browser tests | success |
| Event OS browser tests | **cancelled** (~68 min in; human cancel) |

**CI is not completely green** — infrastructure/operator cancel during Event OS e2e, not a product/test failure of the Packet 2 remediation. No second CI trigger per single-run rule.

## Explicit non-acceptance

EOS-S06 remains unaccepted pending AI CTO review. EOS-S07 remains unstarted. Protected files and Control Tower untouched.
