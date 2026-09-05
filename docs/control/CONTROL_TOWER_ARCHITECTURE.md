# Control Tower Architecture (planning)

**Slice:** MD-CT0  
**Implementation:** none  
**Base route:** `/programme` (accepted programme direction; not built)

## Purpose

Private, evidence-derived programme dashboard. Progress is calculated from manifests, commits, checks, evidence and gates. RAG explains; it does not own status.

## Context

```text
[GitHub repo kglaw-Oluseyi/atelier-doclar]
        │ signed webhook / scheduled reconcile (CT3 — ingestion boundary; no HTTP route)
        ▼
[Ingestion adapters — least privilege, idempotent]
        ▼
[Domain services: SliceRecord projector, DAG, gates, open items]
        ▼
[Immutable programme snapshot]
        ▼
[Private /programme UI — CT4+ ; not built]
        │
        ├── structured status API (authoritative)
        └── RAG retrieval (citation layer only; CT7 — not built)
```

Control Tower outage must not stop Event OS or Event-Day operations.

## Route architecture (defined, not implemented)

| Route | Surface |
|-------|---------|
| `/programme` | Executive portfolio, critical path, now/next/later, blockers, ask |
| `/programme/roadmap` | Phase/slice DAG + accessible table |
| `/programme/event-os` | Event OS product |
| `/programme/event-day` | Runtime R-series and venue/rehearsal/pilot gates |
| `/programme/academy` | Academy |
| `/programme/marketing` | Marketing OS |
| `/programme/ushering` | Premium Ushering |
| `/programme/integration` | Contracts and consumer/provider tests |
| `/programme/open-items` | Filterable risks/decisions |
| `/programme/commits` | Slice-linked commits and unlinked work |
| `/programme/evidence` | Evidence index |
| `/programme/decisions` | ADR/decision register |
| `/programme/releases` | Candidates and unsigned gates |

Access: private authenticated URL; roles executive / reviewer / implementer / reader. No dashboard control may sign CEO, independent, specialist or live-event approval.

## Data models

See `programme/schema/SLICE_MANIFEST_VS_RECORD.md`.

- Manifest = declared work contract.
- SliceRecord = evidence-derived projection.
- ProgrammeSnapshot = immutable revision + source commit + products + slices + open items + gates.

## RAG boundary (not built)

Allow-listed canonical/control sources; chunk metadata includes version and supersession; structured status queried from the database; citations required; abstain when unsupported; retrieved text is data not instructions; RAG failure must not impair the roadmap.

## Provider / hosting decision points (not selected as facts)

| Point | CT0 stance |
|-------|------------|
| Git provider | Actual remote is GitHub `kglaw-Oluseyi/atelier-doclar` — this is the only authorised implementation target |
| CI | **ABSENT**. Recommendation: GitHub Actions (see decisions). CEO not required to *recommend*; required before treating CI as production authority |
| Hosting / Railway | Historical preference only. No Railway interaction in CT0. CEO decision before any deploy |
| Auth / IdP | Functional need: private `/programme`. IdP product is an open decision |
| Database | Functional need from CT2. Historical preference PostgreSQL/Prisma. Not implemented |

## CT1 boundary

CT1 implements validation and mapping only. It does not create this runtime topology.
