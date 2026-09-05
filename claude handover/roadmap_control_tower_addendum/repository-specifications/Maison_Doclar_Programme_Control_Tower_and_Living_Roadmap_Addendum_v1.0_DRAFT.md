**MAISON DOCLAR**

Programme Control Tower and Living Roadmap Addendum

Evidence-derived progress for the complete Maison Doclar software
programme

MD-ORG-RM-001 \| Version 1.0 \| 5 September 2026

**DRAFT FOR CEO RATIFICATION**

# Executive decision

Create a private Programme Control Tower at a stable dedicated route,
recommended \`/programme\`, with product views for Shared Foundation,
Event OS, Academy, Marketing OS, Premium Ushering, Event-Day Runtime and
Cross-System Integration. The dashboard is not a manually coloured
spreadsheet: its progress, outstanding work, commits, checks, evidence
and gates are calculated from version-controlled slice manifests and
trusted CI/repository events.

# 1. Objectives

- Answer “where are we now?” from evidence in seconds.

- Show what each accepted slice delivered and what remains.

- Keep open items, decisions, blockers and authorities visible.

- Tie progress to exact commits, tests, evidence and canonical
  requirements.

- Expose dependency and critical-path effects across five products.

- Provide a citation-required RAG assistant for grounded status
  questions.

- Prevent Cursor, Claude or a developer from self-declaring external
  approval.

# 2. Truth model

| **Question**            | **Authoritative answer**                                                                                     |
|-------------------------|--------------------------------------------------------------------------------------------------------------|
| Was a slice planned?    | A valid, reviewed slice manifest exists in Git.                                                              |
| Was it implemented?     | Expected files and coherent commit exist; checks ran.                                                        |
| Was it accepted?        | Reviewer acceptance, commit and evidence satisfy the exit criteria.                                          |
| Is a product complete?  | All mandatory slices and product gates are accepted; no blocking open item.                                  |
| Is it production-ready? | Independent, specialist, live-validation and CEO gates required for that product are approved and unexpired. |
| What is outstanding?    | Dependency-unlocked unaccepted slices plus all open/blocking items.                                          |
| What changed?           | Immutable timeline of manifest, commit, check, evidence, decision and gate events.                           |

# 3. Status rules

| **Status**  | **System rule**                                                              |
|-------------|------------------------------------------------------------------------------|
| NOT_STARTED | No accepted work event; dependencies may be incomplete.                      |
| READY       | All dependencies accepted and no blocking open item.                         |
| IN_PROGRESS | A linked branch/commit or explicit start record exists; not yet submitted.   |
| BLOCKED     | At least one unresolved blocking item or failed required gate.               |
| IN_REVIEW   | Implementation/evidence submitted; reviewer decision outstanding.            |
| ACCEPTED    | Named reviewer, accepted commit and required evidence satisfy exit criteria. |
| SUPERSEDED  | A recorded decision points to the replacement slice/version.                 |

Percent complete is secondary. If displayed, it is \`accepted mandatory
slice weight ÷ total mandatory slice weight\`; weights are approved
during planning and cannot be changed to improve the number
retrospectively. Product and programme status must never be inferred
from commits alone.

# 4. Recommended information architecture

| **Route**              | **Primary surface**                                                                                         |
|------------------------|-------------------------------------------------------------------------------------------------------------|
| /programme             | Executive portfolio overview, current gate, critical path, blockers, recent changes and “ask the programme” |
| /programme/roadmap     | Phase/slice roadmap with dependency graph and timeline                                                      |
| /programme/event-os    | Event OS phases, slices, releases, open items and evidence                                                  |
| /programme/event-day   | Event-Day Runtime R-series, venue/rehearsal/pilot gates                                                     |
| /programme/academy     | Academy build plus courseware, question/practical and certification readiness                               |
| /programme/marketing   | Marketing OS capabilities, integrations, channel/AI authority and release                                   |
| /programme/ushering    | Premium Ushering system, Academy link, offline/manual/hardware readiness                                    |
| /programme/integration | Contracts, versions, provider/consumer tests and failure isolation                                          |
| /programme/open-items  | Filterable risks, blockers, decisions, dependencies, owner and age                                          |
| /programme/commits     | Slice-linked commits, checks, changed paths and deployments                                                 |
| /programme/evidence    | Tests, screenshots, logs, documents, rehearsals and approvals                                               |
| /programme/decisions   | Decision and ADR register with supersession                                                                 |
| /programme/releases    | Candidate builds, gates, residual risks and signatures                                                      |

# 5. Executive overview

| **Component**      | **What it must show**                                                                             |
|--------------------|---------------------------------------------------------------------------------------------------|
| Programme header   | Snapshot revision, source commit, generated time, freshness and environment                       |
| Portfolio cards    | Product status, accepted/total mandatory slices, blockers, next eligible slice and target release |
| Critical path      | Current gate and dependency chain that controls the earliest safe release                         |
| Now / next / later | Accepted since last review; in progress; next ready; dependency-held                              |
| Open items         | Critical/high blockers, ageing, owner and decision authority                                      |
| Commit stream      | Accepted and pending-review commits linked to slices and checks                                   |
| Quality            | Required checks passing/failing/stale; test and accessibility/security trends                     |
| Release gates      | Architecture, product, integration, content, specialist, venue, independent and CEO states        |
| RAG query          | Grounded answer with citations, freshness and missing-evidence warning                            |

# 6. Product roadmap view

- Phase bands with ordered slices and dependency connectors.

- Each slice card: ID, outcome, status, dependencies, owner, accepted
  commit, last update, evidence completeness, open-item count and next
  action.

- Selecting a slice opens canonical references, expected/actual files,
  commits, test results, screenshots/logs, decisions and verification
  verdict.

- Outstanding view separates ready work, dependency-held work, blocked
  work, review queue and external gates.

- A “since last accepted slice” comparison shows newly satisfied
  requirements and remaining impact.

# 7. Charts that earn their place

| **Chart**                  | **Purpose / safeguard**                                                         |
|----------------------------|---------------------------------------------------------------------------------|
| Dependency DAG             | Shows sequencing and critical path; cycles are validation errors.               |
| Cumulative accepted slices | Progress over time using accepted dates, not commit volume.                     |
| Open-item ageing           | Counts by severity and age; accepted risks displayed separately.                |
| Gate matrix heatmap        | Products × release gates; unknown never appears green.                          |
| Verification trend         | Required checks pass/fail/stale across accepted slices.                         |
| Commit-to-slice coverage   | Exposes unlinked commits and slices without implementation evidence.            |
| RAG source coverage        | Indexed canonical/control sources, stale/failed ingestion and orphan citations. |

# 8. Update architecture

The Control Tower should use event-driven updates with a safe polling
fallback. Git/CI webhooks enter a validated ingestion queue; a worker
fetches authoritative metadata using a least-privilege integration,
verifies repository and branch, links events to slice manifests,
recalculates a new immutable programme snapshot and invalidates the
relevant private dashboard cache. Document and decision changes follow
the same model after review.

| **Source event**         | **Update**                                                             |
|--------------------------|------------------------------------------------------------------------|
| Push / pull request      | Commit, branch, changed paths and linked slice ID                      |
| CI workflow              | Checks, tests, build, security/accessibility results and evidence URIs |
| Slice acceptance         | Reviewer, accepted commit, exit-criteria evidence and status           |
| Open item / decision     | Owner, severity, authority, due date, resolution and affected slices   |
| Document change          | Canonical version/hash, supersession and RAG re-index request          |
| Deployment               | Environment, release candidate, health and rollback reference          |
| Rehearsal/pilot/approval | Evidence metadata and gate state; named authorised actor required      |

# 9. “Real-time” service level

- Repository/CI status target: visible within five minutes of trusted
  event receipt.

- Manual decision/approval: visible immediately after authorised
  submission and validation.

- RAG document index: target within 24 hours of accepted canonical
  change, with index freshness shown.

- If a webhook fails, periodic reconciliation compares provider state
  and repairs omissions.

- Stale data is labelled with last successful source time; it is never
  silently served as current.

# 10. RAG design

RAG is a clarity layer, not the source of status. Structured queries
answer counts, states, blockers and commits from the programme database.
Retrieval augments explanations from canonical documents, decisions,
slice manifests, build ledgers and evidence indexes. Every factual
answer includes source links and snapshot freshness.

| **Control**              | **Requirement**                                                                                           |
|--------------------------|-----------------------------------------------------------------------------------------------------------|
| Index allow-list         | Only accepted canonical/control documents and authorised evidence; exclude drafts unless labelled.        |
| Chunk identity           | Document ID/version/path/hash, heading/doctrine ID, effective/superseded state and access classification. |
| Hybrid retrieval         | Metadata filtering + keyword/vector retrieval; structured status queried directly.                        |
| Grounding                | Citations required for each claim; answer “not evidenced” when support is absent.                         |
| Permissions              | Retrieve only sources the signed-in user may read; no cross-organisation/event leakage.                   |
| Prompt-injection defence | Treat retrieved text as data, not instructions; allow-list actions and sources.                           |
| Freshness                | Show index revision and source snapshot; invalidate superseded chunks.                                    |
| Evaluation               | Golden questions, citation correctness, abstention, access control, freshness and adversarial tests.      |

# 11. Core entities

| **Entity**                  | **Key fields**                                                                          |
|-----------------------------|-----------------------------------------------------------------------------------------|
| Programme / Product / Phase | Stable ID, order, owner, releases and status policy                                     |
| Slice                       | Outcome, weight, dependencies, criteria, canonical refs, expected files, status/version |
| Commit / Check / Deployment | Provider IDs, immutable SHA, result, timestamps and evidence                            |
| Evidence                    | Kind, URI, hash, source, classification and immutable flag                              |
| Open item / Decision        | Severity, owner, blocker, authority, due date, disposition and affected objects         |
| Gate / Approval             | Required evidence, authority, status, expiry and conditions                             |
| Snapshot / Timeline event   | Revision, source commit, calculation version and change event                           |
| RAG source/chunk            | Source identity/version/hash, permissions, embeddings/index revision and citations      |

# 12. Security and governance

- Private authenticated URL; least privilege by executive, reviewer,
  implementer and reader roles.

- Repository token is read-only unless a separately approved action
  requires write; secrets remain outside Git.

- Webhook signature and replay validation; provider allow-list and
  delivery audit.

- No dashboard button may sign CEO, independent, specialist,
  protocol/cultural or live-event approval on another person’s behalf.

- Immutable acceptance and gate history; corrections append events.

- Sensitive logs and evidence are access-classified and redacted.

- Exports include snapshot revision and source commit to prevent stale
  screenshots becoming authority.

# 13. Availability and graceful degradation

- If Git/CI is unavailable, serve the last verified snapshot with a
  prominent stale banner.

- If RAG is unavailable, structured roadmap and evidence remain fully
  usable.

- If chart rendering fails, accessible tables expose the same
  information.

- If webhook processing fails, retry safely and run scheduled
  reconciliation; idempotency prevents duplicate events.

- No Control Tower outage may stop Event OS or Event-Day operational
  execution.

# 14. Definition of done

- Private route deployed in approved environment

- All five products plus foundation/integration represented

- Manifest validation and dependency-cycle detection

- Provider/CI event ingestion with idempotency and freshness

- Evidence-derived status calculator with tests

- Complete responsive/accessibility/error/stale states

- RAG citations, permissions, abstention and evaluation

- File/commit/open-item/gate drill-down

- Historical snapshots and audit timeline

- Operational runbook, backup, monitoring and recovery

- Independent acceptance and CEO production authorisation

# Ratification

| **Decision**                                         | **Name / signature / date** |
|------------------------------------------------------|-----------------------------|
| Control Tower approved                               |                             |
| Recommended \`/programme\` route approved or amended |                             |
| Status and acceptance rules approved                 |                             |
| RAG boundary approved                                |                             |
| CEO ratification                                     |                             |
