# EOS-S05 Implementation Record

**Slice ID:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028` / `MD-PR-S029`
**Status:** `IN_PROGRESS` — Milestones 1–2 implemented; not accepted
**Catalogue slice:** yes — accepted-slice count remains 4  
**Production:** unauthorised (`productionAuthorised` remains false)  
**Starting baseline:** `bb705588e0d4481802658a18d7666e28e3a18fea`
**Authority commit:** `cee64f6f69bfc6dace53ffc60d8232e6938653de`
**Platform commit:** `bd65c02e790082ea2d46e1323a848c42446e512a`
**Event OS commit:** `e4ec11712c7f4fb3db0b3f4e6afc4b6ebc02c8b8`

## Scope delivered

Milestone 1 only: ratification, ADR, canonical mapping, additive migration `EOS-S05-VENUE-LAYOUT-V1`, venue/fact/adoption/layout persistence, Command Atelier registry and blank-layout surfaces, typed attendance read adapter, isolation/idempotency/hash tests, and Event OS deploy to Railway project `atelier-doclar` after gates.

Milestone 2 added typed spatial objects, one command path, SVG studio projection, navigator/inspector equivalence, draft undo/redo, lease/autosave/conflict recovery, and additive migration `EOS-S05-VENUE-OBJECTS-V1`. Historic units `S5-14`–`S5-27` and `S5-31`–`S5-38` are implemented substantively; `MD-PR-0245`–`MD-PR-0269` remain `NOT_EXECUTED`. Milestone 3–4, EOS-S06, binary assets, publication and independent acceptance were not started. Control Tower was not a deploy target.

## Product constitution

EOS-S05 owns organisation-owned venues, venue facts, event adoption snapshots/overrides, layouts and layout revisions. It never stores guest identity, allocates seats, certifies safety, calculates capacity, or rewrites RSVP/forecast/provision ledgers.

## Geometry and hashing

Canonical millimetres. Top-left origin, X right, Y down. Deterministic canonical serialization. Display units do not enter the content hash.

## Staff authority

| Permission | CEO | Event Director | Planner | Auditor | Sysadmin |
|------------|-----|----------------|---------|---------|----------|
| `venue.registry.view` | yes | yes | yes | yes | yes |
| `venue.record.create` / `update` | yes | yes | yes | no | no |
| `venue.fact.record` | yes | yes | yes | no | no |
| `venue.fact.verify` | yes | yes | no | no | no |
| `venue.adopt` / `venue.event.override` | yes | yes | yes | no | no |
| `layout.view` | yes | yes | yes | yes | yes |
| `layout.create` / `update` / `lease.acquire` | yes | yes | yes | no | no |
| `layout.constraint.override` | yes | yes | no | no | no |

Historic Venue Liaison / Production Lead / Accessibility Lead / Safety Authority labels are responsibility descriptions. No new system role was added. System Administrator has view only and no operational approval.

## Object-storage status

No approved object-storage, malware-scanning or safe-derivative implementation exists. Evidence is metadata-only. `uploadAvailable` is `false`. The gap remains `TDR-S05-001` for Milestone 3.

## First-run verification

Workspace `pnpm typecheck` passed. `pnpm test` passed (design-system 8, academy 14, programme-domain 155, shared-platform 282, programme-ingestion 46, event-os 72, programme-tower 42, control-tower 3). `pnpm programme:validate` passed. `pnpm --filter @maison-doclar/event-os build` passed. `git diff --check` clean after removing trailing whitespace on new `CURRENT_STATE.md` EOS-S05 lines.

Focused `test/venue-journeys.test.ts` first run: 5 passed / 3 failed.

| Failure | Class | Root cause | Correction |
|---------|-------|------------|------------|
| Cross-client adopt used Event Director on a Beta-client event | test | Director fixture assignment is scoped to Alpha events; `createEvent` for client Beta raised `SCOPE_MISMATCH` | CEO created the Beta event and attempted the second adopt |
| Two-organisation isolation expected only `FORBIDDEN` / `SCOPE_MISMATCH` | test | Deny-path maps `SCOPE_MISMATCH` to `NOT_FOUND` | Test accepts `NOT_FOUND` |
| Pixel persistence asserted `PIXEL_PERSISTENCE` but received schema validation | product | `screenX` failed Zod `.strict()` before the geometry guard | `assertNoPixelPersistence` now runs before `parseStrict` on layout create/update |

Second focused run: 8/8 passed.

Playwright first run: `s05-responsive-a11y` passed; `s05-venue-vertical` failed. `getByLabel('Count')` matched both the unit `<select>` option and the count textbox. Class: test. Correction: `getByRole('textbox', { name: 'Count' })`.

Second Playwright run: `getByLabel('Venue')` matched section-tab navigation `Event venue sections` and the adopt select. Class: test / label clarity. Correction: select `select[name="venueId"]`; visible label is now `Organisation venue`.

Third Playwright run: `s05-venue-vertical` passed (24.9s). Combined rerun of both S05 specs passed (35.6s), including keyboard focus on Register venue, 360/768/720/1440 viewports, 200% zoom, and axe.

See `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md` item `TDR-S05-001` and carried `TDR-S04F-001`–`002` / `TDR-S04E-001`–`004` / `TDR-S04D-004` / `TDR-S04A-011`. EOS-S05 is not accepted. EOS-S06 is not authorised.

## Milestone 2 first-run verification

Workspace `pnpm typecheck` passed after adding `canOverrideConstraint` to the venue-registry capability fallback. Focused `test/spatial-journeys.test.ts` first run: 6 passed / 1 failed before the remaining cases were added; later 8/9 then 9/9.

| Failure | Class | Root cause | Correction |
|---------|-------|------------|------------|
| Shared-platform typecheck: `ApplyLayoutCommandResult` import | product | Result type lives in `spatial-operations`; service returns `Layout` | Service imports the input schema only and returns `.layout` |
| Shared-platform typecheck: `actor.person.id` | product | Command actor context uses `personId` | Use `ctx.actor.person.id` inside `mutate` |
| Spatial tests treated command results as `{ objects, layout }` | test | Public service returns `Layout`; objects are read from the workspace | Tests call `getLayoutSetupWorkspace` |
| Planner weakening of a governed lock failed with lease denial | test | Director create ran while the planner still held the exclusive lease | Planner creates the governed area, then is denied weakening it |
| Two-event isolation failed with `SCOPE_MISMATCH` on adopt | test | Director/planner fixtures are assigned only to Alpha One | CEO adopted Alpha Two; planner command with the wrong event id is denied |
| Event OS typecheck: `VenueCapabilities` fallback | product | Milestone 2 added `canOverrideConstraint` | Fallback includes `canOverrideConstraint: false` |

`pnpm --filter @maison-doclar/shared-platform test` passed (291). Event OS unit tests passed (72). `pnpm programme:validate` passed. Event OS build passed. `git diff --check` was clean after removing trailing spaces on new M2 doc lines.

Playwright first run: `s05-responsive-a11y` and studio responsive passed. Studio authoring timed out on `getByLabel('Origin X (mm)')` after reload because focus did not reselect. Class: test. Correction: click the navigator row after search. Venue vertical timed out on the adopt select because the studio spec had already adopted Alpha One. Class: test isolation. Correction: adopt only when the select is present.

Playwright second run: authoring and venue journeys reached axe. Both failed `scrollable-region-focusable` on `.studio-canvas-frame`. Class: product / accessibility. Correction: the overflow canvas is keyboard-focusable (`tabIndex={0}`) with an accessible name.

Human/browser verification remains deferred until the complete EOS-S05 slice.
