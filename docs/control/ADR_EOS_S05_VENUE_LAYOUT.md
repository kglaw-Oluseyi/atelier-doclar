# ADR — EOS-S05 venue registry and spatial contract

**Status:** Selected for Milestone 1  
**Slice:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028`  
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
7. **Assets.** Evidence is metadata-only until an approved object-storage, malware-scanning and safe-derivative pipeline exists.

## Bounded context

```
Organisation ── owns ── Venue ── has ── VenueFact (+ optional metadata evidence)
     │
     └── Client ── owns ── Event ── adopts ── EventVenue ── snapshots/overrides ── EventVenueFact
                                              │
                                              └── Layout ── LayoutRevision (immutable)
                                                         └── LayoutEditorLease (one active)
Attendance adapter ── reads ── RSVP / Forecast / Provision / Calibration (no write)
```

## Consequences

The database remains authoritative. A future Konva canvas is a projection. Guest placement remains EOS-S06. Publication, full object catalogue and capacity calculations remain later milestones.
