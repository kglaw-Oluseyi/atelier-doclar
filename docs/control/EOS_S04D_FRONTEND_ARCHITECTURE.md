# EOS-S04D Frontend Architecture

**Slice:** `EOS-S04D`  
**Prompt Control ID:** `MD-PR-S022`  
**Visual language:** Command Atelier (onyx frame, ivory surface, champagne detail, functional accent `#8B6E38`)

## Surfaces

| Surface | Route | Session | Authority |
|---------|-------|---------|-----------|
| Event overview forecast strip | `/app/events/[eventId]` | Staff | `forecast.detail.view` |
| RSVP-adjacent forecast context | `/app/events/[eventId]/rsvp` | Staff | `forecast.detail.view` |
| Forecast workspace | `/app/events/[eventId]/forecast` | Staff | `forecast.detail.view` plus mutation keys |
| Approved host projection | `/app/events/[eventId]/forecast/host` | Staff | `forecast.hostProjection.view` |
| Academy delta | `/app/academy/aca-s04d` | Staff | Assigned learning path only |

Workspace sections: three products, whole-event range band, observed RSVP, phase occupancy, uncertainty, provision, run, override, host approval, shadow calibration, history, parameter governance.

Charts are range bands with a textual equivalent, labelled people units, and visible low / centre / high. Axes are not truncated to invent precision.

## Non-authorities preserved

- RSVP workspace remains S03 observed truth.
- Guest, party and phase pages remain S04A/S04B.
- Merchandise remains S04C and is not a person count.
- Host projection never shows parameter tables, staff notes, individual probabilities or audit internals.
- No vendor booking, payment or communication control is rendered.

## States

Forecast forms use existing operational-state patterns: loading, empty/no forecast, stale, forbidden, not-found, validation, conflict, self-approval denial, success and safe retry. Success copy states that RSVP was not changed and that provision is not a vendor order.

## Responsive and access

Primary journeys must remain usable at 360px, 768px, desktop and 200%-equivalent zoom without document-level horizontal overflow. Enabled controls use `pointer`. Disabled controls use `not-allowed`. Reduced-motion disables decorative forecast motion. Visible focus is required.
