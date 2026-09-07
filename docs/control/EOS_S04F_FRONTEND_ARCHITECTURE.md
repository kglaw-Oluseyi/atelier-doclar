# EOS-S04F Frontend Architecture

**Slice:** `EOS-S04F`  
**Prompt Control ID:** `MD-PR-S026`

## Visual ruling

Staff Event OS retains Command Atelier (onyx frame, ivory working surface, decorative champagne `#B89A62` where already used, functional light-surface accent `#8B6E38`).

The private host Atelier retains the quieter editorial composition from EOS-S04E. Host multilingual editions appear inside the existing EDITIONS chapter. They are labelled synthetic and unvalidated. Language is named; flags are not used.

Enabled clickable items use `pointer`. Disabled actions use `not-allowed`. Reduced-motion disables decorative transition.

Language CSS is scoped under `.language-atelier` and does not overwrite Event OS tokens.

## Surfaces

| Surface | Route | Session | Authority |
|---------|-------|---------|-----------|
| Event overview | `/app/events/[eventId]` | Staff | existing event view; link “Language and editions” |
| Language workspace | `/app/events/[eventId]/language` | Staff | `language.preference.view` plus mutation keys |
| Host Atelier editions | `/atelier` | `md_event_os_atelier` | approved host-facing edition only |
| Academy delta | `/app/academy/ACA-S04F` and `/app/academy/aca-s04f` | Staff | assigned learning path only |

Staff workspace sections: preferences, cultural source library, translation comparison, coverage, recipient assembly preview, glossary, preference history.

Source stays first. Target sits beside it from 900px and stacks beneath it on a narrow viewport.

## Language presentation

- HTML `lang` is set on source, translation and cultural text.
- Preference cards show language names and codes, or “No preference supplied”.
- Partial, stale and fallback states are labelled for staff.
- Recipient preview states internally that it is ready for communications review, not dispatched, and that no provider was invoked.
- Machine-translation iconography is not used.

## States

No preference, unsupported language, missing source, missing translation, partial coverage, stale translation, unapproved translation, placeholder mismatch, reviewer unavailable, self-approval denied, optimistic conflict, cross-event denial, dependency unavailable, assembly blocked, approved/ready for review, superseded edition, safe retry.

Each mutation uses the accepted correlation-scoped action-result mechanism. Success copy does not claim RSVP, campaign or dispatch changed.

## Responsive and access

Primary journeys must remain usable at 360px, 768px, 200%-equivalent (720×450), desktop, long German compounds, French accents, Yorùbá diacritics and Simplified Chinese without document-level horizontal overflow. Keyboard focus and axe must pass on the staff language workspace.
