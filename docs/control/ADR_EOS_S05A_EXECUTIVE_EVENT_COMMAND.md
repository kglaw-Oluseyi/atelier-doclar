# ADR — EOS-S05A Executive Event Command

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S037`
**Status:** PLACEHOLDER pending `EEC-01`
**Authority:** George Lawson, CEO of Maison Doclar

This placeholder exists because `EEC-00` requires an ADR before application behaviour is added. `EEC-01` must freeze module ownership and dependency direction from the ratified documents. It must not invent a parallel architecture.

## Decisions already binding from the ratified corpus

- Pre-engagement records are organisation-scoped and are not Events.
- Operational conversion is explicit and idempotent.
- Immutable edition/content-hash pattern applies to brief, investment, price/rule/template, roadmap and recommendation publications.
- Source, provenance and audit are append-only.
- Mutable working records use compare-and-set.
- Calculations are pure functions over immutable snapshots.
- The AI provider interface is optional and disabled by default.
- Executive Event Command is distinct from Programme Control Tower.
- EOS-S05A extends `@maison-doclar/shared-platform`. It does not create a parallel identity, Client, Event, RSVP, forecast, programme, venue or audit store.

## Required modules (to be created under EEC-01)

`engagement-intake`, `discovery-intelligence`, `event-brief`, `investment-intelligence`, `budget-intelligence`, `roadmap-intelligence`, `change-intelligence`, `executive-event-command`, `ai-assistance`.

`executive-event-command` consumes projections and owns no truth. `ai-assistance` creates proposals through application interfaces and may not import persistence adapters directly.

## Out of scope for Foundation Milestone A

Canonical Brief publication, Budget Studio, Roadmap Studio, change intelligence, conversational AI journey and the complete Executive Event Command dashboard remain in `EEC-11`–`EEC-45` and are not released by `MD-PR-S037`.
