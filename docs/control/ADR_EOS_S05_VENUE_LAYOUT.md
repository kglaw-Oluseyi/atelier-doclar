# ADR — EOS-S05 venue registry and spatial contract

**Status:** Selected for Milestones 1–4
**Slice:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028` / `MD-PR-S029` / `MD-PR-S030` / `MD-PR-S031`
**Date:** `2026-09-08`

## Context

Historic Slice 5 packs describe a venue registry, event adoption, spatial layout and a future canvas. The accepted Event OS already owns organisation, client, event, person, assignment, RSVP and forecast truth. Milestone 1 must freeze geometry, scope, permissions, persistence and revision contracts before studio and publication layers depend on them.

## Decision

1. **Scope hierarchy.** Reusable venues are organisation-owned. EventVenue, Layout and operational spatial records are event-scoped. Historic `tenant_id` maps to `organisationId → clientId → eventId`. Cross-client reuse is denied by default.
2. **Geometry.** Canonical coordinates and dimensions are finite non-negative integer millimetres. Origin is the top-left of the layout bounds. X increases right. Y increases down. Rectangles use top-left origin plus width/height. Ellipses use centre plus radii. Rotation is a normalised millidegree in `[0, 360000)`. Display metres or feet are presentation only. Viewport zoom, pan and screen pixels are transient.
3. **Hashing.** Content hashes use deterministic canonical serialization with sorted object keys and stable object-id ordering.
4. **Concurrency.** One active editor lease per layout. Durable optimistic `expectedVersion` / `expectedRevisionNumber` checks remain mandatory. No real-time collaborative editing.
5. **Safety.** Only venue-supplied or qualified-authority safety thresholds may later become locked blocking constraints. Software never labels a layout safe, compliant, certified or authority-approved merely because rules passed.
6. **Attendance.** EOS-S05 may read observed RSVP, whole-event forecast, phase occupancy, operational provision and observed attendance through a typed adapter. It must not copy or mutate those ledgers or sum phase counts as whole-event people.
7. **Assets.** Floor-plan binaries are stored privately in the authorised Railway bucket after content-safety inspection. Delivery is an authenticated Event OS stream. No public bucket and no durable public URL. A source asset is not spatially authoritative until calibrated from a verified measurement. Venue-fact evidence remains metadata-only.
8. **Capacity.** Declared venue, geometric, operational, expected attendance, observed RSVP, forecast range, phase occupancy, operational provision and observed attendance remain distinct products. No universal reduction percentage. Phases are not summed as whole-event people.
9. **Validation.** Findings bind to an exact layout revision and content hash. Material edits stale findings. Locked qualified-source constraints cannot be weakened by an ordinary operator. Software never claims regulatory, fire, engineering, accessibility or crowd-safety certification. Finding evidence is bounded so large layouts cannot fail persistence.
10. **Publication.** Maker/checker binds to the exact canonical hash. The author cannot approve. System Administrator has no operational approval. Publication is idempotent, immutable and superseding. Restore creates a new draft revision. The authenticated downstream contract contains no guest identity.
11. **Export.** PDF/PNG derive from the current publication hash when one exists, otherwise the approved or draft hash, marked truthfully. Completion is recorded only after a durable private object exists. Restricted/safety geometry is masked without override authority. No guest identity.

## Bounded context

```
Organisation ── owns ── Venue ── has ── VenueFact (+ optional metadata evidence)
     │
     └── Client ── owns ── Event ── adopts ── EventVenue ── snapshots/overrides ── EventVenueFact
                                              │
                                              └── Layout ── LayoutRevision (immutable)
                                                         ├── LayoutEditorLease (one active)
                                                         ├── FloorPlanAsset / Calibration (private object + verified scale)
                                                         ├── CapacityStatement
                                                         ├── ValidationRun / Finding / Override
                                                         ├── Snapshot (immutable named hash)
                                                         ├── Approval (maker/checker)
                                                         └── Publication (CURRENT / SUPERSEDED / WITHDRAWN)
Attendance adapter ── reads ── RSVP / Forecast / Provision / Calibration (no write)
Downstream contract ── projects ── current publication (no guest identity)
```

## Consequences

The database remains authoritative. Milestone 2 projects typed objects through SVG rather than Konva so the canvas cannot become a parallel JSON blob. Milestone 3 adds fail-closed assets, distinct capacity products, hash-bound validation, immutable snapshots, maker/checker, publication supersession and a guest-free downstream spatial contract. Guest placement remains EOS-S06. Live binary upload remains unavailable until George supplies an approved provider. EOS-S05 is not accepted.
