# EOS-S05 Frontend Architecture

**Slice:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028` / `MD-PR-S029`
**Surface:** Command Atelier staff Event OS  
**Milestone:** 2 — typed spatial objects and layout studio

## Routes

| Route | Scope | Purpose |
|-------|-------|---------|
| `/app/venues` | Organisation | Venue registry |
| `/app/venues/new` | Organisation | Create synthetic venue |
| `/app/venues/[venueId]` | Organisation | Detail, facts, provenance, verification |
| `/app/events/[eventId]/venue` | Event | Adopt, overrides, attendance boundary |
| `/app/events/[eventId]/layouts` | Event | Layout list |
| `/app/events/[eventId]/layouts/new` | Event | Blank-layout creation |
| `/app/events/[eventId]/layouts/[layoutId]` | Event | Setup, geometry, revision and layout studio |

## Visual language

Onyx `#11100F`, ivory `#F5F0E8`, decorative champagne `#B89A62`, functional accent `#8B6E38`. Existing `atelier-masthead`, `atelier-panel`, `data-table` card labels, `PendingSubmit` and signed action results are reused. No generic dashboard grid.

## States

Designed empty, loading, permission-denied, validation-error, persistence-failure, conflict and no-venue states. Success is shown only after durable persistence. Conflict locks mutation until reload.

## Mobile

Desktop is the complete precision-authoring surface: SVG projection, snap guides, drag move, zoom/pan/fit, undo/redo. Tablet supports touch authoring and complete review. Mobile is a labelled review surface; precision canvas editing is off by default and can be re-enabled. Keyboard-only users can search, select, inspect, move, resize, rotate, duplicate, delete and recover from conflict through the navigator and inspector. Viewport pan, zoom and selection are transient and are not hashed.

Canvas technology: custom SVG projection of typed persisted objects. Konva/`react-konva` was not added so a canvas JSON blob cannot become parallel truth and Next.js 15 / React 19 server rendering stays unblocked.
