# EOS-S05 Frontend Architecture

**Slice:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028`  
**Surface:** Command Atelier staff Event OS  
**Milestone:** 1 — venue registry and blank-layout setup

## Routes

| Route | Scope | Purpose |
|-------|-------|---------|
| `/app/venues` | Organisation | Venue registry |
| `/app/venues/new` | Organisation | Create synthetic venue |
| `/app/venues/[venueId]` | Organisation | Detail, facts, provenance, verification |
| `/app/events/[eventId]/venue` | Event | Adopt, overrides, attendance boundary |
| `/app/events/[eventId]/layouts` | Event | Layout list |
| `/app/events/[eventId]/layouts/new` | Event | Blank-layout creation |
| `/app/events/[eventId]/layouts/[layoutId]` | Event | Setup / geometry / revision |

## Visual language

Onyx `#11100F`, ivory `#F5F0E8`, decorative champagne `#B89A62`, functional accent `#8B6E38`. Existing `atelier-masthead`, `atelier-panel`, `data-table` card labels, `PendingSubmit` and signed action results are reused. No generic dashboard grid.

## States

Designed empty, loading, permission-denied, validation-error, persistence-failure, conflict and no-venue states. Success is shown only after durable persistence. Conflict locks mutation until reload.

## Mobile

Desktop is the complete precision-authoring surface. Tablet supports review and structured editing. Mobile supports venue facts, comparison, approval-adjacent viewing and published/emergency viewing later; Milestone 1 precision canvas authoring is not present and is therefore not claimed. Tables become labelled cards at 360px.
