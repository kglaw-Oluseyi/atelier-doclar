# EOS-S04E Implementation Record

**Slice ID:** `EOS-S04E`  
**Prompt Control ID:** `MD-PR-S024`  
**Status:** `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS`  
**Catalogue slice:** no  
**Production:** unauthorised (`productionAuthorised` remains false)  
**Starting baseline:** `3463590e5b3f6f2b4070140c73ee803386542c39`

## Scope delivered

P00–P11: ratification, canonical mapping, shared-platform atelier contracts, additive migration `EOS-S04E-ATELIER-V1`, host-access boundary, staff publishing workspace, private host Atelier, ACA-S04E, Playwright evidence, and Event OS deploy to Railway project `atelier-doclar`.

EOS-S04F and EOS-S05 were not started. Control Tower was not a deploy target.

## Product constitution

The private Atelier is a commissioned host experience: Vision, Blueprint, Journey, Decisions, Editions, Updates, Assurance. Event OS remains operational truth. Host decisions create requests and receipts. They do not mutate RSVP, forecast, programme, merchandise or communications ledgers.

## Host access

| Item | Design |
|------|--------|
| Cookie | `md_event_os_atelier` (`ATELIER_SESSION_COOKIE`), path `/atelier` |
| Staff cookie | `md_event_os_session` — not reused |
| Guest / vendor cookies | not reused |
| Link hash | HMAC of `atelier-link:{token}` with `EVENT_OS_ATELIER_LINK_PEPPER` |
| Session | HMAC cookie with `EVENT_OS_ATELIER_SESSION_SECRET` |
| Challenge | purpose-scoped, single-use, short TTL, fail-closed replay / expiry / revoke / forge |
| Roles | grant-scoped: Principal Host, Co-host, Family Representative, Executive Assistant, Corporate Representative, Read-only Host, Maison Doclar Liaison, Auditor |
| Environment names | `EVENT_OS_ATELIER_LINK_PEPPER`, `EVENT_OS_ATELIER_SESSION_SECRET` (optional `EVENT_OS_ATELIER_KEY_ID`) |

Values are never committed. Railway rejects fixture-default secrets.

## Staff authority

| Permission | CEO | Event Director | Planner | Auditor | Sysadmin |
|------------|-----|----------------|---------|---------|----------|
| `atelier.view` | yes | yes | yes | yes | no |
| `atelier.manage` | yes | yes | yes | no | no |
| `atelier.publish` | yes | yes | yes | no | no |
| `atelier.access.manage` | yes | yes | yes | no | no |
| `atelier.decision.publish` | yes | yes | yes | no | no |
| `atelier.decision.review` | yes | yes | no | no | no |
| `atelier.audit.view` | yes | yes | no | yes | no |

Maker/checker: the staff publisher of a decision cannot review the resulting receipt. Read-only Host cannot submit. Host sessions cannot assign staff, edit RSVP, change forecast parameters, send campaigns or sign protected gates.

## Decision / receipt lifecycle

1. Staff publishes a decision request.
2. Authorised host sees permitted context.
3. Host submits a versioned choice.
4. Receipt records the choice, `changedCanonicalData: false`, review state, next owner and outcome.
5. Authorised staff reviews when required.
6. Canonical owners apply any later downstream change outside this slice.
7. Host sees a truthful receipt. No false success.

## First-run verification

Workspace `pnpm typecheck`, `pnpm test` (585 pass / 0 fail), `pnpm programme:validate` and `pnpm --filter @maison-doclar/event-os build` passed. `git diff --check` clean.

`packages/shared-platform/test/atelier-journeys.test.ts` first run: 3 passed / 1 failed (idempotent replay with a stale expected version was treated as the same choice). Product behaviour was correct; the test was tightened. Second run: 4 passed.

Playwright `e2e/s04e-vertical.spec.ts` and `e2e/s04e-responsive-a11y.spec.ts`: first run 1 passed / 3 failed (issued-access flash omitted `atelier`, a DRAFT assertion after a prior publish, and 360px `loginAs` identity in the hidden staff nav). After those test/flash fixes, the vertical host journey and ACA-S04E passed. A later isolated axe login hit the known Next.js local memory restart; axe was folded into the vertical journey and then passed. These were test and flash-read defects, not host-journey product failures.

See `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md` items `TDR-S04E-001`–`002` and carried `TDR-S04D-004`.
