# ADR — EOS-S05A Executive Event Command

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S037`
**Status:** ACCEPTED for Foundation Milestone A module ownership (`EEC-01`)
**Authority:** George Lawson, CEO of Maison Doclar

This ADR freezes module ownership and dependency direction from the ratified corpus. It does not invent a parallel architecture.

## Decisions

- Pre-engagement records are organisation-scoped and are not Events.
- Operational conversion is explicit and idempotent. Conversion is not released in Foundation Milestone A.
- Immutable edition/content-hash pattern applies to later brief, investment, price/rule/template, roadmap and recommendation publications.
- Source, provenance and audit are append-only.
- Mutable working records use compare-and-set.
- Calculations are pure functions over immutable snapshots.
- The AI provider interface is optional and disabled by default. Milestone A uses deterministic fixture extraction only.
- Executive Event Command is distinct from Programme Control Tower.
- EOS-S05A extends `@maison-doclar/shared-platform`. It does not create a parallel identity, Client, Event, RSVP, forecast, programme, venue, audit or persistence layer.

## Module ownership

| Module | Owns | Must not own |
|--------|------|--------------|
| `engagement-intake` | Opportunity and engagement start/update/participant commands | Event conversion, Client fabrication |
| `discovery-intelligence` | Consent, session, source, coverage, assertion and conflict commands | Brief publication, budget calculation |
| `event-brief` | Brief identifier types only in Milestone A | Approved brief editions |
| `investment-intelligence` | Reserved boundary | Investment editions |
| `budget-intelligence` | Reserved boundary | Budget Studio, monetary engine runtime |
| `roadmap-intelligence` | Reserved boundary | Roadmap Studio |
| `change-intelligence` | Reserved boundary | Change propagation |
| `executive-event-command` | Permission-safe discovery projections | Persistence truth |
| `ai-assistance` | Fixture proposal helpers | Persistence adapters, governing mutations |

Dependencies flow from shared identity, organisation, person, permission and audit primitives into these modules. `executive-event-command` consumes projections. `ai-assistance` may not import persistence adapters. Destination domains own later approved propagation adapters (`EEC-11`–`EEC-45`).

## Persistence

Foundation records are additive `platform_*` collections on the existing Event OS Postgres store. Migration `EOS-S05A-DISCOVERY-V1` is replay-safe and non-destructive.

## Out of scope for Foundation Milestone A

Canonical Brief publication, Budget Studio, Roadmap Studio, change intelligence, conversational AI journey and the complete Executive Event Command dashboard remain in `EEC-11`–`EEC-45` and are not released by `MD-PR-S037`.
