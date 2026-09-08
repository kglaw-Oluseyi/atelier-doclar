# EOS-S05 Implementation Record

**Slice ID:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028`  
**Status:** `IN_PROGRESS` — Milestone 1 implemented; not accepted  
**Catalogue slice:** yes — accepted-slice count remains 4  
**Production:** unauthorised (`productionAuthorised` remains false)  
**Starting baseline:** `bb705588e0d4481802658a18d7666e28e3a18fea`
**Authority commit:** `cee64f6f69bfc6dace53ffc60d8232e6938653de`
**Platform commit:** `bd65c02e790082ea2d46e1323a848c42446e512a`
**Event OS commit:** `e4ec11712c7f4fb3db0b3f4e6afc4b6ebc02c8b8`

## Scope delivered

Milestone 1 only: ratification, ADR, canonical mapping, additive migration `EOS-S05-VENUE-LAYOUT-V1`, venue/fact/adoption/layout persistence, Command Atelier registry and blank-layout surfaces, typed attendance read adapter, isolation/idempotency/hash tests, and Event OS deploy to Railway project `atelier-doclar` after gates.

Milestone 2–4, EOS-S06, canvas authoring, publication and independent acceptance were not started. Control Tower was not a deploy target.

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

Historic Venue Liaison / Production Lead / Accessibility Lead / Safety Authority labels are responsibility descriptions. No new system role was added. System Administrator has view only and no operational approval.

## Object-storage status

No approved object-storage, malware-scanning or safe-derivative implementation exists. Evidence is metadata-only. `uploadAvailable` is `false`. The gap is recorded for Milestone 2 or 3 as `TDR-S05-001`.

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
