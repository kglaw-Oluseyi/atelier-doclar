# EOS-S04 Human Verification Remediation Report

- **Prompt Control ID:** MD-PR-S017-R2
- **Starting HEAD:** `c9eb3a287bbff1de5416065ece5ae0e3675c5573`
- **Slice:** EOS-S04
- **Product:** EVENT_OS
- **Production-Authorised:** NO

## Findings addressed

| Finding | Summary |
|---|---|
| HV-EOS-S04-08 | Explicit event-scoped guest selection before unmatched `LINK`; default non-linking action |
| HV-EOS-S04-09 | Controlled UI workflow for `proposeContactCorrection`; enriched corrections review surface |
| HV-EOS-S04-10 | Safe public error mapping for reply eligibility denials (quiet hours, channel, contact, etc.) |
| HV-EOS-S04-02 | Campaign author and approver human-readable attribution on campaign detail |

## Root causes

| Finding | Root cause |
|---|---|
| HV-EOS-S04-08 | `UnmatchedForm` submitted empty hidden `guestId` while exposing `LINK` without a picker |
| HV-EOS-S04-09 | Domain propose/decide existed; no propose server action or unmatched/corrections UI workflow |
| HV-EOS-S04-10 | `replyOnThread` threw `FORBIDDEN` with generic `publicMessageFor`, discarding eligibility reason codes |
| HV-EOS-S04-02 | `createdByPersonId` stored but not rendered; approver history not shown |

## Files changed

### Shared platform
- `packages/shared-platform/src/communications-operations.ts` — `replyEligibilityPublicMessage`
- `packages/shared-platform/src/service.ts` — reply eligibility public message on deny
- `packages/shared-platform/src/index.ts` — export `replyEligibilityPublicMessage`, `fieldValue`
- `packages/shared-platform/test/communications-hv-remediation.test.ts` — new unit tests

### Event OS
- `apps/event-os/src/components/unmatched-resolution-form.tsx` — new client form (HV-08)
- `apps/event-os/src/components/propose-correction-form.tsx` — new client form (HV-09)
- `apps/event-os/src/components/communications-forms.tsx` — remove unsafe `UnmatchedForm`; gate approve UI on permission
- `apps/event-os/src/server/actions.ts` — `proposeCorrectionAction`
- `apps/event-os/src/server/comms-display.ts` — staff/guest display helpers
- `apps/event-os/src/app/app/events/[eventId]/communications/unmatched/page.tsx`
- `apps/event-os/src/app/app/events/[eventId]/communications/corrections/page.tsx`
- `apps/event-os/src/app/app/events/[eventId]/communications/campaigns/[campaignId]/page.tsx`
- `apps/event-os/src/app/globals.css` — meta-list, fieldset, radio accessibility
- `apps/event-os/e2e/zz-communications-hv.spec.ts` — new E2E (blocked on Windows; see below)

## Tests added

- `packages/shared-platform/test/communications-hv-remediation.test.ts`
- `apps/event-os/e2e/zz-communications-hv.spec.ts`

## Test results

| Check | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `pnpm test` (workspace) | PASS |
| `pnpm --filter @maison-doclar/shared-platform test` | PASS (73 tests) |
| `pnpm --filter @maison-doclar/event-os test` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os e2e` | **BLOCKED** — Playwright webServer command uses `rm` (Unix) which fails on Windows (`'rm' is not recognized`); E2E not executed in this environment |

## Remaining findings

All four in-scope HV findings (02, 08, 09, 10) are remediated in source. Other EOS-S04 human-verification items not in MD-PR-S017-R2 scope remain **PENDING CEO VERIFICATION**. EOS-HV2 is **not** marked complete or accepted.

## Confirmations

- **EOS-S05:** Not touched
- **Production:** Remains unauthorised (`productionAuthorised: false` contract unchanged)
- **Protected gates:** Remain unsigned / NOT_READY (no gate files modified)
- **Deployment:** Cursor did not deploy or mutate Railway
- **Accepted implementation SHA:** Not altered; no acceptance evidence manufactured
