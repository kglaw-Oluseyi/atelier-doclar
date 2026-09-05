**MAISON DOCLAR**

Claude Instruction — Master Roadmap and Control Tower

Planning authority for a continuously updated, evidence-derived
programme view

MD-ORG-RM-CLD-001 \| Version 1.0 \| 5 September 2026

**DRAFT FOR CEO RATIFICATION**

# Instruction to Claude

Use this document with the prior Claude Build-Planning and
Cursor-Control Handover and the repository inventory. Do not implement
code. Produce the definitive programme roadmap, machine-readable
manifests, dependency model, file/commit plan and Cursor prompt inputs
needed to build the Control Tower.

# 1. Required analysis

1.  Open and reconcile the authoritative build plans and prompt packs
    for Event OS, Event-Day Runtime, Academy, Marketing OS and Premium
    Ushering.

2.  Verify the actual repository tree and any application code created
    since the inventory.

3.  Resolve canonical, duplicate, recovered and superseded sources
    through the authority register.

4.  Map every existing slice/prompt to a common product–phase–slice
    model without losing original IDs.

5.  Identify dependencies within and between products; reject cycles or
    surface them as decisions.

6.  Define mandatory versus optional slices and propose stable weights
    only for executive summaries.

7.  Define entry/exit criteria, expected files, checks, evidence and
    approval gates for every slice.

8.  Identify open items, external authorities and live validation that
    code cannot complete.

9.  Propose the target URL, authentication and hosting approach
    consistent with the actual repo.

10. Submit planning artifacts for CEO ratification before Cursor
    receives CT1 or later.

# 2. Mandatory deliverables

| **File**                                   | **Contents**                                                                          |
|--------------------------------------------|---------------------------------------------------------------------------------------|
| docs/control/PROGRAMME_ROADMAP.md          | Readable G0–G12 programme, product phases, sequence, critical path and release gates  |
| docs/control/PROGRAMME_DEPENDENCIES.md     | Cross-product DAG, dependency rationale and cycle report                              |
| docs/control/ROADMAP_DATA_DICTIONARY.md    | Entity/field/status/evidence/freshness/authority definitions                          |
| docs/control/CONTROL_TOWER_ARCHITECTURE.md | Routes, services, ingestion, snapshots, RAG, security, availability and ADR links     |
| docs/control/CONTROL_TOWER_UX.md           | Every surface, chart, table, drill-down, state and responsive/accessibility behaviour |
| programme/products/\*.yaml                 | Stable product records                                                                |
| programme/phases/\*.yaml                   | Ordered phase records                                                                 |
| programme/slices/\*\*/\*.yaml              | One validated manifest per slice                                                      |
| programme/gates/\*.yaml                    | Gate requirements and authorities                                                     |
| programme/open-items/\*.yaml               | Known unresolved work and decisions                                                   |
| programme/schema/\*                        | JSON schemas/Zod contracts and validation                                             |
| prompts/control-tower/\*.md                | Direct-to-Cursor CT0–CT9 prompts                                                      |
| docs/control/POST_BUILD_VERIFICATION.md    | Reusable phase/slice verification record                                              |

# 3. Roadmap quality rules

- A slice is one reviewable production outcome, not an entire product
  and not a trivial file edit.

- The first slice in every product proves architecture/current state;
  the last prepares evidence but cannot self-release.

- Every slice identifies exact canonical sources and expected files.

- Outstanding work is derived, not manually narrated: unaccepted
  mandatory slices, unsatisfied dependencies, open blockers and
  incomplete gates.

- Accepted status requires named reviewer, immutable commit and required
  evidence.

- A commit without a slice ID is visible as unlinked work.

- A slice with code but no accepted evidence remains IN_REVIEW or
  BLOCKED, not complete.

- External and CEO decisions are never defaulted to approved.

# 4. Product ordering to validate

| **Stage**            | **Programme intent**                                                                            |
|----------------------|-------------------------------------------------------------------------------------------------|
| Foundation           | Authority, monorepo/repository choice, CI, identity, tenancy, shared contracts, evidence system |
| Event OS foundations | Clients, events, guests, venues, suppliers, staff, schedule and readiness                       |
| Academy foundations  | Learners, roles, competency, content governance and OS readiness contract                       |
| Event OS operations  | Seating/access, requests, incidents, command, intelligence and permanent record                 |
| Marketing OS         | Commercial/marketing domain on approved CRM and consent boundaries                              |
| Premium Ushering     | Field service and staffing on Event OS/Academy foundations                                      |
| Event-Day Runtime    | Signed package, devices/PWA/scanning, ledger, LAN operation and reconciliation                  |
| Cross-system closure | Contract tests, change propagation, end-to-end security/accessibility/performance and release   |

Claude may recommend a different interleaving when evidence supports it,
but must identify the critical path and explain why. No product may
quietly create its own competing identity, guest, event, staff, consent
or doctrine model.

# 5. Slice manifest requirements

| **Field group** | **Required definition**                                                     |
|-----------------|-----------------------------------------------------------------------------|
| Identity        | Stable slice ID, product, phase, order, title, owner and version            |
| Purpose         | Observable outcome, canonical refs and requirement IDs                      |
| Dependencies    | Required accepted slices/contracts/gates and rationale                      |
| Implementation  | Domain/data/API/frontend/security/offline/integration/observability         |
| Files           | Inspect, add, modify, migrate, generate and protected paths                 |
| Acceptance      | Entry/exit criteria, required checks, browser/live cases and evidence kinds |
| Control         | Open items, authority, status transitions, weight and supersession          |

# 6. RAG corpus plan

- Index accepted canonical Markdown preferentially; extract DOCX only
  when no controlled Markdown exists.

- Attach product, document ID, version, status, path, heading/doctrine
  ID, hash, permissions and effective date to each chunk.

- Keep structured programme status outside vector retrieval and join it
  into answers.

- Define at least 50 golden questions covering progress, outstanding
  work, dependencies, commits, blockers, source authority and release
  readiness.

- Require cited answers and abstention when evidence is missing or
  stale.

- Plan re-index on accepted source change and removal/supersession of
  old chunks.

# 7. Claude output format

11. Executive roadmap summary and recommended critical path.

12. Full product/phase/slice catalogue with counts.

13. Dependency graph and unresolved cycles.

14. File/commit manifest per slice.

15. Control Tower architecture and UX specification.

16. RAG corpus, retrieval, permission and evaluation plan.

17. CT0–CT9 Cursor prompts populated for the actual repository.

18. Post-build verification and live-check template.

19. Open decision, risk and external authority register.

20. CEO ratification page; stop before implementation.

# Copy-ready instruction

Read the Programme Control Tower Addendum, the prior Claude handover,
the complete repository inventory and every controlling product build
plan. Do not implement code. Verify the repository’s current state, then
create a unified, dependency-correct roadmap for Event OS, Event-Day
Runtime, Academy, Marketing OS, Premium Ushering and cross-system
integration.  
  
Define stable product, phase, slice, gate, open-item, commit and
evidence records. For every slice state the exact outcome, canonical
sources, dependencies, expected files, entry/exit criteria, tests,
evidence and commit boundary. Produce machine-readable manifests
validated by schema, a readable roadmap, critical path, Control Tower
architecture/UX, RAG corpus/evaluation plan, post-build verification
template and direct-to-Cursor CT0–CT9 prompts adapted to the actual
repository.  
  
Progress must be computed from accepted commits and evidence, never
asserted manually. Preserve external authority and CEO release locks.
Surface unknowns, contradictions, cycles and missing implementation.
Submit the complete planning pack for CEO ratification and stop before
code.
