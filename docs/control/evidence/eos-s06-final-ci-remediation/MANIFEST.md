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

Filled after commit, event-os deploy, and single `programme-validate` run.
