# Control Tower UX Specification (planning)

**Slice:** MD-CT0  
**Implementation:** none  
**Design direction:** Premium, restrained, operationally clear. No decorative metrics.

## Surfaces

### Executive portfolio (`/programme`)

Portfolio cards per product: calculated status, accepted/total mandatory slices, blockers, next eligible slice. Critical path. Now / next / later. Open high/critical items. Commit stream. Gate strip. Freshness of the snapshot. “Ask the programme” (RAG) with citations.

### Product views

One view per product route. Phase bands, slice cards (ID, outcome, status, dependencies, evidence completeness, open-item count). Selecting a slice opens canonical refs, expected/actual files, commits, tests, screenshots/logs, decisions.

### Phase / slice drill-down

Canonical references, prompt map (qualified IDs), files, commits, checks, evidence, open items, next action. Outstanding work split: ready / dependency-held / blocked / in review / external gate.

### Critical path

Dependency chain that controls the earliest safe release. Cycles are errors, not decoration.

### Now / next / later

Accepted since last review; in progress; next ready; dependency-held. Not a manually painted kanban.

### Blockers and open items

Severity, age, owner, decision authority, affected slices. Accepted risks listed separately from open blockers.

### Commit stream

Slice-linked commits and **unlinked** commits. A commit without a slice ID is visible as unlinked work.

### Evidence drill-down

Kind, URI, hash, source, freshness, access classification. Missing required evidence is explicit.

### Gate status and releases

Architecture, product, integration, content, specialist, venue, independent, CEO. Unknown never green. Residual risk visible. Signatures only by named authority.

### Freshness indicators

Last successful source time. Stale banner if Git/CI unavailable. Index revision for RAG.

### RAG assistant

Answers doctrine, decisions, prompts, manifests, evidence, open items — with citations. Does not override structured status. Abstains when unsupported.

## Required states (every relevant surface)

| State | Behaviour |
|-------|-----------|
| Loading | Explicit; no fake completeness |
| Empty | Explain what is absent and why |
| Denied | Role/permission; no data leak |
| Stale | Timestamp + last good snapshot |
| Degraded | Roadmap remains if RAG/charts fail |
| Conflict | Version/package mismatch visible |
| Error | Recoverable action; no silent retry-as-success |
| Recovery | How to restore the last verified snapshot |

## Accessibility and responsive behaviour

Charts have table equivalents. Colour is not the only status channel. Unknown ≠ green. Mobile: portfolio and open items first; DAG offers a list equivalent. Keyboard and screen-reader paths required at implementation time (CT4+).

## What not to show

Decorative gauges, vanity commit counts as “progress”, self-approved gates, inferred production readiness.
