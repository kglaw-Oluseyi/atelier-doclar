# EOS-S04D Implementation Record

**Slice ID:** `EOS-S04D`  
**Prompt Control ID:** `MD-PR-S022`  
**Status:** `ACCEPTED` (historical `IN_REVIEW / NOT READY` superseded by `docs/control/EOS_S04D_ACCEPTANCE.md`; this record remains implementation evidence)
**Catalogue slice:** no  
**Production:** unauthorised (`productionAuthorised` remains false)  
**Starting baseline:** `2f86fee762678d01e502a23a026511cafb4e3f57`

## Scope delivered

P00–P11: ratification, canonical mapping, shared-platform contracts, additive migration `EOS-S04D-FORECAST-PLANNING-V1`, deterministic `FORECAST-MODEL-V1`, services, Command Atelier forecast workspace and host projection, ACA-S04D, Playwright evidence, and Event OS deploy to Railway project `atelier-doclar`.

EOS-S04E, EOS-S04F and EOS-S05 were not started. Control Tower was not a deploy target.

## Model

`FORECAST-MODEL-V1` is deterministic millicount arithmetic over versioned rate bands. Same canonical inputs and parameter version reproduce the same result. Rates are labelled `PROVISIONAL_DEFAULT_NOT_LAGOS_FACT`. Sensitive-trait keys are rejected. Unnamed allowances contribute uncertainty, not fabricated guests.

Known-population fixture (Event Alpha One):

| Population | Count |
|------------|-------|
| Distinct people (`guestId`) | 6 |
| YES | 4 |
| NO | 1 |
| NO_RESPONSE | 1 |
| Unnamed allowance (not a person) | 1 |
| Church people | 3 |
| Reception people | 4 |
| Programme expected exact | 4.05 |
| Programme display low / centre / high | 3 / 4 / 5 |

Phase displayed centres are not added together as whole-event attendance.

## Authority matrix (staff)

| Permission | CEO | Event Director | Planner | Auditor | Sysadmin |
|------------|-----|----------------|---------|---------|----------|
| `forecast.run` | yes | yes | yes | no | no |
| `forecast.detail.view` | yes | yes | yes | yes | no |
| `forecast.hostProjection.view` | yes | yes | yes | yes | no |
| `forecast.override.propose` | yes | yes | yes | no | no |
| `forecast.override.approve` | yes | yes | no | no | no |
| `provision.propose` | yes | yes | yes | no | no |
| `provision.approve` | yes | yes | no | no | no |
| `model.parameters.manage` | yes | yes | no | no | no |
| `model.evaluate` | yes | yes | no | no | no |
| `forecast.audit.view` | yes | yes | no | yes | no |

Maker/checker: proposer cannot approve the same override or provision. Self-approval fails server-side. Stale checksum or version conflict fails closed. The operator who ran a forecast cannot approve the same host projection.

## Domain rules retained

- Observed RSVP, forecast and operational provision are three products.
- People are counted by `guestId`. Invitations, households, parties, RSVP rows and unnamed allowances are not people.
- Forecasts never mutate RSVP, invitation, guest identity, companions, attendance, credentials, orders or communications.
- Host projection is calm, approved, and excludes parameters, staff notes, guest probabilities and audit internals.

## First-run verification

Workspace `pnpm typecheck`, `pnpm test` (563 pass / 0 fail), `pnpm programme:validate` and `pnpm --filter @maison-doclar/event-os build` passed. `git diff --check` clean.

Playwright `e2e/s04d-vertical.spec.ts` and `e2e/s04d-responsive-a11y.spec.ts`: first run 1 passed / 3 failed (strict-mode locators and axe before the host heading was ready). After locator and wait fixes, 4 passed. These were test assertions, not product defects. The known-population range 3 / 4 / 5, maker/checker, host calm projection and ACA-S04D no-authority path were already correct on the first product journey.

See `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md` item `TDR-S04D-001`. Event-scoped parameter creation is dual-control-role gated but is not a separate proposer/checker workflow. Existing forecast runs remain immutable.

## Historical closeout (not acceptance)

Written while the slice was `IN_REVIEW / NOT READY`. Independent focused Claude verification after remediation is `docs/control/EOS_S04D_FOCUSED_CLAUDE_VERIFICATION.md`. Whole-slice prompt remains `docs/control/EOS_S04D_CLAUDE_IN_CHROME_VERIFICATION.md` and must not be re-run for already passed journeys.

Formal technical acceptance is `docs/control/EOS_S04D_ACCEPTANCE.md` (`MD-PR-S023`, SHA `64683a853ead39c62caeb2d2e9f26bcb9d1dca21`).
