# EOS-S04E Frontend Architecture

**Slice:** `EOS-S04E`  
**Prompt Control ID:** `MD-PR-S024`

## Visual ruling

Staff Event OS retains Command Atelier (onyx frame, ivory working surface, decorative champagne `#B89A62` where already used, functional light-surface accent `#8B6E38`).

The private host Atelier uses a quieter editorial composition in the same Maison family: layered ivory/parchment, onyx inset frame, decorative metal `#B79F85` for borders and atmosphere only. Decorative metal never conveys required state. Enabled clickable items use `pointer`. Disabled actions use `not-allowed`. Reduced-motion disables decorative transition.

Host CSS is scoped to `.host-atelier` and does not overwrite Event OS tokens.

## Surfaces

| Surface | Route | Session | Authority |
|---------|-------|---------|-----------|
| Event overview | `/app/events/[eventId]` | Staff | existing event view; link to Private Atelier |
| Staff Atelier workspace | `/app/events/[eventId]/atelier` | Staff | `atelier.view` plus mutation keys |
| Host invitation exchange | `/atelier/[token]` | none → host cookie | single-use magic link |
| Host Atelier | `/atelier` | `md_event_os_atelier` | grant chapters and `canDecide` |
| Unavailable | `/atelier/unavailable` | none | fail-closed, no existence disclosure |
| Academy delta | `/app/academy/ACA-S04E` and `/app/academy/aca-s04e` | Staff | assigned learning path only |

Staff workspace: publication state, narrative edition, reveal, host-access issue/revoke, pending review.

Host chapters: Today, Vision, Journey, Blueprint, Ensemble, Decisions, Assurance, Editions, Updates. Drafts are hidden. Assurance uses approved forecast aggregates only.

## States

Invitation loading, expired / redeemed / forwarded / invalid link, revoked grant, session expired, step-up required, unpublished Atelier, empty chapter, superseded edition, pending / expired decision, validation, optimistic conflict, staff review pending, approved/rejected, unauthorised/cross-event, safe retry. Success copy states that canonical Event OS records were not rewritten.

## Responsive and access

Primary journeys must remain usable at 360px, 768px, desktop and 200%-equivalent zoom without document-level horizontal overflow. Keyboard focus and axe must pass on staff workspace and host story.
