# EOS-S04C Frontend Architecture

**Slice:** `EOS-S04C`  
**Prompt Control ID:** `MD-PR-S020`  
**Visual language:** Command Atelier (onyx frame, ivory surface, champagne detail, functional accent `#8B6E38`)

## Surfaces

| Surface | Route | Session | Authority |
|---------|-------|---------|-----------|
| Staff merchandise workspace | `/app/events/[eventId]/merchandise` | Staff cookie `md_event_os_session` | `merch.*` permissions |
| Guest dossier adjacent card | `/app/events/[eventId]/guests/[guestId]` | Staff | `merch.offer.view` |
| Guest directory badge | `/app/events/[eventId]/guests` | Staff | `merch.collection.view` |
| Guest-access offers (RSVP-adjacent, not the primary S04C path) | `/rsvp` (after S03 exchange) | Guest RSVP cookie `md_event_os_guest_rsvp` | Own offers only |
| Private merchandise guest view | `/offers/[token]` → `/offers` | Separate cookie `md_event_os_offers` | Issued merch grant only |
| Merchandise guest unavailable | `/offers/unavailable` | None | Expired, revoked or forged |
| Vendor portal | `/vendor/[token]` → `/vendor` | Separate cookie `md_event_os_vendor` | Assignment-scoped `VENDOR_CAPABILITY` |
| Vendor unavailable | `/vendor/unavailable` | None | Expired, revoked or forged |

Vendor routes are public to the staff middleware in the same way as `/rsvp`. They do not accept a staff session as vendor authority.

## Non-authorities preserved

- RSVP workspace remains S03. Merchandise is linked as adjacent coordination only.
- Programme/phase pages remain S04B. Collection `phaseIds` are targeting, not attendance.
- Guest dossier RSVP, party and phase panels are unchanged.
- No payment, card, receipt or extra measurement fields are rendered.

## States

Staff, guest-merchandise and vendor forms use existing operational-state and live-region patterns: success, validation, conflict, forbidden, not-found, session-required. Issued staff tokens are shown once via a short-lived httpOnly flash cookie, never as canonical plaintext. Vendor expiry and revocation resolve to `/vendor/unavailable`. Merchandise guest expiry and revocation resolve to `/offers/unavailable`. Access is never labelled ready unless the presented synthetic link is currently usable.

## Responsive and access

Primary journeys must remain usable at 360px, 768px, desktop and 200%-equivalent zoom without document-level horizontal overflow. Enabled controls use `pointer`. Disabled controls use `not-allowed`. Reduced-motion disables decorative motion on merchandise and vendor shells.
