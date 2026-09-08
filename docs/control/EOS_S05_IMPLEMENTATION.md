# EOS-S05 Implementation Record

**Slice ID:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028` / `MD-PR-S029` / `MD-PR-S030` / `MD-PR-S031` / `MD-PR-S032`
**Status:** `IN_PROGRESS` — Milestones 1–4 implemented; not accepted
**Catalogue slice:** yes — accepted-slice count remains 4  
**Production:** unauthorised (`productionAuthorised` remains false)  
**Starting baseline:** `bb705588e0d4481802658a18d7666e28e3a18fea`
**Authority commit:** `cee64f6f69bfc6dace53ffc60d8232e6938653de`
**Platform commit:** `bd65c02e790082ea2d46e1323a848c42446e512a`
**Event OS commit:** `e4ec11712c7f4fb3db0b3f4e6afc4b6ebc02c8b8`
**Milestone 2 platform commit:** `446113bad699849fd9f92d7d37d09d94ac762b8c`
**Milestone 2 Event OS commit:** `82c758978d08e59018f539e399efda2c24733bfb`
**Milestone 3 platform commit:** `d9d5882f856410d5630106443f9936da3ff6dea5`
**Milestone 3 Event OS commit:** `0bec2ef166354d4ad5b55aad9f932f74cb80f2f4`
**Milestone 4 platform commit:** `ff7b052b258d0859a30c62a7364a0087d214b445`
**Milestone 4 Event OS commit:** `d087843d6c32ab47e94b348f30533c43edf0e270`
**Milestone 4 overflow-fix commit:** `e646a864b00606f7a0e6f7b66d5d62feba826b8f`

## Scope delivered

Milestone 1 only: ratification, ADR, canonical mapping, additive migration `EOS-S05-VENUE-LAYOUT-V1`, venue/fact/adoption/layout persistence, Command Atelier registry and blank-layout surfaces, typed attendance read adapter, isolation/idempotency/hash tests, and Event OS deploy to Railway project `atelier-doclar` after gates.

Milestone 2 added typed spatial objects, one command path, SVG studio projection, navigator/inspector equivalence, draft undo/redo, lease/autosave/conflict recovery, and additive migration `EOS-S05-VENUE-OBJECTS-V1`. Historic units `S5-14`–`S5-27` and `S5-31`–`S5-38` are implemented substantively; `MD-PR-0245`–`MD-PR-0269` remain `NOT_EXECUTED`.

Milestone 3 added the decision and publication chain: provider-neutral fail-closed floor-plan assets, distinct capacity products, a versioned validation engine, immutable snapshots with semantic/spatial diff and restore-as-new-version, maker/checker approval, idempotent immutable publication, permission-safe published viewer/export contracts, and an authenticated guest-free downstream spatial projection. Historic units `S5-28`–`S5-30` and `S5-39`–`S5-55` are implemented substantively and remain `NOT_EXECUTED` as individual prompt runs.

Milestone 4 completed production-quality floor-plan ingest and PDF/PNG export inside Railway project `atelier-doclar`: private Railway bucket `event-os-layout-assets` / `event-os-layout-assets-j1zxpb`, in-process content-safety scanning for allowlisted PDF/SVG/PNG/JPEG, sanitised derivatives, authenticated expiry-controlled streaming (no public bucket, no durable public URL, no stored signed URLs), and exact-hash exports that complete only after a durable private object exists. Venue evidence remains metadata-only. EOS-S06 and independent acceptance were not started. Control Tower was not a deploy target. Claude-in-Chrome is held for AI CTO review.

## Product constitution

EOS-S05 owns organisation-owned venues, venue facts, event adoption snapshots/overrides, layouts, layout revisions, capacity statements, validation, snapshots, approvals and publications. It never stores guest identity, allocates seats, certifies safety, or rewrites RSVP/forecast/provision ledgers. Capacity products remain separate.

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
| `layout.asset.manage` / `layout.capacity.record` / `layout.validation.run` / `layout.snapshot.manage` / `layout.approval.submit` | yes | yes | yes | no | no |
| `layout.approval.decide` / `layout.publish` | yes | yes | no | no | no |
| `layout.publication.view` | yes | yes | yes | yes | yes |
| `layout.downstream.read` | yes | yes | yes | yes | no |

Historic Venue Liaison / Production Lead / Accessibility Lead / Safety Authority labels are responsibility descriptions. No new system role was added. System Administrator has view only and no operational approval.

## Object-storage status

Production floor-plan storage is bound in Railway project `atelier-doclar` only.

| Item | Value |
|------|-------|
| Bucket display name | `event-os-layout-assets` |
| Bucket ID | `fa78e87f-a8e8-4dcf-af33-f296f9833588` |
| S3 bucket name | `event-os-layout-assets-j1zxpb` |
| Endpoint | `https://t3.storageapi.dev` |
| Region | `auto` (US West / `sjc`) |
| URL style | `virtual-host` |
| Scanner | `in-process-content-safety` |
| Export | `EVENT_OS_LAYOUT_EXPORT_ENABLED=1` |

Secret variable names only: `EVENT_OS_LAYOUT_ASSET_ACCESS_KEY`, `EVENT_OS_LAYOUT_ASSET_SECRET_KEY`. Values are never committed or logged. Compile-time `LAYOUT_ASSET_PROVIDER_CONFIGURED` remains `false`; runtime uses Event OS env binding. Objects are private. Delivery is an authenticated Event OS stream with `Cache-Control: private, no-store`. Completion is recorded only after `put` plus `get` of the stored object. An uploaded file is not spatially authoritative until verified calibration. This is content-safety scanning for allowlisted floor-plan types, not a general antivirus product. `TDR-S05-001` is closed for the floor-plan pipeline. Venue evidence attachments remain metadata-only.

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

## Milestone 3 first-run verification

Workspace `pnpm typecheck` passed. Focused `test/layout-assurance-journeys.test.ts` first run: 8 passed / 3 failed.

| Failure | Class | Root cause | Correction |
|---------|-------|------------|------------|
| Director could not approve a planner submission | product | `isSystemAdministrator` inspected every catalogue role, so every actor appeared to be a system administrator | Check the actor's active assignments only |
| Playwright snapshot name missing after create | test | Form submitted before the prior table/capacity navigation settled | Wait for navigator table and longer snapshot timeout |
| Playwright `Record decision` never appeared | test | `/SUBMITTED/i` matched help copy “submitted hash”; director also opened a newly created layout | Assert `layout-approval-SUBMITTED` and reopen the same layout URL |

Second focused unit run: 11/11 passed. Shared-platform tests 302. Event OS unit tests 72. `pnpm programme:validate` passed. Event OS build passed. `git diff --check` clean after removing an extra EOF blank line in `atelier.css`.

Playwright first passing run after those test corrections: `s05-assurance-vertical` 2 passed (26.7s), including axe, 360/768/1440 overflow checks and 200% zoom.

Human/browser verification remains deferred until the complete EOS-S05 slice.

See `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md`. EOS-S05 is not accepted. Milestone 4 and EOS-S06 are not authorised.

## Milestone 4 first-run verification

Authority `MD-PR-S031`. Starting SHA `41b40d6f4001b1c6913209cbe420b9080f64965d`. Platform `ff7b052b258d0859a30c62a7364a0087d214b445`. Event OS `d087843d6c32ab47e94b348f30533c43edf0e270`.

Workspace `pnpm typecheck` passed. Focused `test/layout-assurance-journeys.test.ts` 11/11. Focused `test/layout-milestone4.test.ts` first run 7 passed / 1 failed.

| Failure | Class | Root cause | Correction |
|---------|-------|------------|------------|
| Representative layout validation could not persist | product | Route-obstruction evidence concatenated every intersecting label and exceeded the 800-character finding schema | Cap evidence, explanation, recommended action and object-id lists in the validation engine |
| Playwright `getByLabel('Label')` matched Owner/Source label | test | Capacity fields share the layout page; Playwright treats `Label` as a substring | Scope the inspector with `getByTestId('studio-inspector').getByRole('textbox', { name: 'Label' })` |
| Playwright `venue-detail` 5s timeout while Save showed Saving… | test / environment | Default assertion timeout during a slow first compile of the create action | Wait up to 20s; rerun passed |
| Live 360px review scrolled horizontally | product | 64-character hashes and correlation tokens overflowed the 360px surface | Wrap hashes/`code`/`dd`; hide shell overflow-x at ≤720px |

Second focused M4 unit run: 8/8. Shared-platform tests 310. Event OS unit tests 72. `pnpm programme:validate` passed. Event OS build passed. `git diff --check` clean.

Playwright first combined S05 run: 4 passed / 2 failed (studio Label; venue-detail timeout). After test corrections, studio + venue rerun: 3/3 passed. Assurance vertical (including axe, 360/768/1440, 200% zoom, mobile authoring limit copy) passed on the first combined run.

Live Event OS at SHA `5f423816796964a8dca77c7291a37eafe74f9412` (deployment `81670232-59e2-4bd1-894c-06a27ea295f8`): assurance journey passed (~12.9s). 360px overflow failed (`document.documentElement.scrollWidth` > clientWidth). Class: product. Root cause: 64-character content hashes and correlation tokens overflowed the 360px review surface. Correction: wrap `code`, hashes and `dd` and hide document-level overflow-x on the shell at ≤720px (`e646a864b00606f7a0e6f7b66d5d62feba826b8f`). Live rerun against deployment `65a0bd39-548b-4377-9f86-aa5dc5e58d0d` at SHA `e646a864b00606f7a0e6f7b66d5d62feba826b8f`: assurance + 360/200% passed (18.1s). Milestone 4 live smoke (upload CLEAN/AVAILABLE PNG, unverified calibration remaining non-authoritative, private no-store PDF/PNG retrieve, snapshot restore without changing publication, stale-tab `VERSION_CONFLICT`, downstream current-publication JSON without guest/seating keys, Postgres reopen) passed first run (16.8s).

Measured scale budgets on a 8-zone / 24-table / 6-fixture / 6-route / 1-safe-area layout: populate under 20s, hash under 250ms, validation under 2s, snapshot under 1s, PNG export under 3s.

Live ready after overflow-fix deploy: `alive`, `ready: true`, `POSTGRES`, `APPLIED`, `productionAuthorised: false`, `layoutAssetStore: READY`, `layoutExport: READY`, fixtures `NON_PRODUCTION_FIXTURE`. Control Tower remained `64642db9-db60-497b-a207-3d5d92fbcae3` and was not redeployed.

## Rollback and forward recovery

Rollback Event OS application code to the previous known-good SHA. Do not run a destructive down-migration. Existing Postgres assurance rows remain readable. Private bucket objects are retained; PENDING export jobs may be retried after redeploy. Forward recovery is additive only. Preview any synthetic-fixture cleanup before deletion. Do not reset the database.

Human/browser Claude-in-Chrome verification remains deferred until AI CTO review of this complete slice.

See `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md`. EOS-S05 is not accepted. EOS-S06 is not authorised.

## Export provenance remediation (`MD-PR-S032`)

Authority `MD-PR-S032`. Starting SHA `97895a81fb5c1cd7330a78e8c13681dbbf7d2d2d`.

The Milestone 4 renderer painted an onyx PNG header with no glyphs and truncated the PDF legend at 180 characters, so long event or layout names could omit the hash, publication number or timestamp. PDF and PNG now use labelled lines. Names may wrap or ellipsis after two lines. Status, complete content hash, publication number and generation timestamp are never truncated. PNG text is a self-contained 5×7 bitmap font painted into the image. Tests inspect generated bytes, not only job metadata.

Local Playwright uses `EVENT_OS_LAYOUT_EXPORT_FIXTURE_STORE=1` for in-process retrieve when Railway S3 is unbound. Production continues to use the bound bucket only. Health `layoutAssetStore` remains an S3 probe.

Focused `test/layout-export-provenance.test.ts` first run: 5 passed / 1 failed.

| Failure | Class | Root cause | Correction |
|---------|-------|------------|------------|
| Long-name PNG OCR returned only `Status: PUBLISHED` | test / evidence harness | Header-height detector required 60% onyx; dense name glyphs dropped below that | Treat a row as canvas only when onyx pixels fall below 8% |
| Playwright `layout-setup` did not contain `S032` | test | Input values are not inner text | Assert the layout-name field and page heading |
| Local download link missing | environment | Playwright has no Railway bucket | Opt-in fixture memory store, never used when S3 is bound |
| Local GET 404 after COMPLETED | environment | Dev HMR recreated the memory store | Hold the fixture store on `globalThis` |
| PNG preview `onload` timed out | test | Image was already complete before the handler attached | Wait for `complete && naturalWidth` |
| Live export refused `synchronous export store required` | product | Production S3 store was passed into snapshot mutation; `put` is async | Pass a binary store into `PlatformService` only for the opt-in fixture store |

Second focused unit run: 6/6. Shared-platform tests 316. Event OS unit tests 72. Focused Playwright `s05-export-provenance` passed (14.4s). `pnpm typecheck`, `programme:validate`, Event OS build and `git diff --check` passed.
