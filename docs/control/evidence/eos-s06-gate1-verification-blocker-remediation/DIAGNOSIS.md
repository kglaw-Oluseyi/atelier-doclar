# Section 1 — Preflight and diagnosis (read-only)

## Git / worktree

| Check | Result |
|-------|--------|
| Local HEAD | `c7f76a0a611fef8a8597ffc321e312ab94f24bf1` |
| `origin/main` | `c7f76a0a611fef8a8597ffc321e312ab94f24bf1` |
| Ancestry | Clean match to origin/main tip |
| Protected untracked artefacts | Present and untouched (`Untitled`, `MD Academy/Untitled`, EOS-S06A zip, EOS-S06B zip, `s076-shard-*`) |

## Canonical controls (summary)

| Topic | Authority |
|-------|-----------|
| EOS-S06 accepted | `MD-PR-S077` / `docs/control/EOS_S06_ACCEPTANCE.md` |
| EOS-S06A accepted | `MD-PR-S079` / `docs/control/EOS_S06A_ACCEPTANCE.md` |
| Gate 1 qualification evidence | `docs/control/evidence/eos-s06-capacity-600/` · commit `5561171…` |
| Gate 1 layout | 63 tables / 600 seats (42×10 + 18×8 + 3×12) |
| Production posture | `productionAuthorised:false`; providers inactive |

## Fixture identity conflict (blocking)

### Accepted Gate 1 fixture (evidence corpus)

| Attribute | Value |
|-----------|-------|
| Intended name | `Capacity Qualification 600` |
| Intended code | `CAP600` |
| Evidence environment | **Ephemeral local Postgres** (`event_os_cap600`) only |
| Seed policy | `apps/event-os/scripts/s06-capacity-600-seed.ts` **refuses** Railway / production hosts |
| Browser evidence | Playwright against ephemeral DB + `next start`, not live Railway |
| Live production count of CAP600 / Capacity Qualification events | **0** |

Concurrency evidence event IDs (`00000000-…021`, `36320fcb-…`) belong to the ephemeral qualification run, not live production.

### Live event Claude identified

| Attribute | Value |
|-----------|-------|
| Name | `EOS-S06-CUR-20260915T173901 Seating` |
| Immutable event ID | `c188d79b-4c1a-4734-9da2-6296324958d0` |
| Code | `S73941100` |
| Organisation | `00000000-0000-4000-8000-000000000001` |
| Client | `00000000-0000-4000-8000-000000000011` |
| Status | `DRAFT` |
| Operational guests | **4** |
| Layout capacity statement quantity | **8** (not 600) |
| Layouts | Current-acceptance hall + successor hall (not 63-table Gate 1 profile) |
| Provenance | EOS-S06 current-acceptance / CUR e2e seating provision — **not** Gate 1 capacity qualification |

**Verdict:** The live event cannot be tied to the accepted 63-table / 600-seat Gate 1 evidence. Stop before mutation.

## Live assignments on CUR event (before; unchanged)

| Assignment ID | Person | Role | Scope |
|---------------|--------|------|-------|
| `033f562f-…` | Amara Okonkwo `…042` | EVENT_DIRECTOR `…002` | Event-scoped |
| `f5b1b1da-…` | James Whitfield `…043` | PLANNER `…005` | Event-scoped |
| `bbe5e795-…` | Samuel Ikeda `…048` | RISK_GOVERNANCE_REVIEWER `…008` | Event-scoped |

No event-scoped CEO or Read-Only Auditor assignment on this event.

### Organisation-wide assignments (unchanged)

| Person | Role | Assignment ID | Scope |
|--------|------|---------------|-------|
| George Lawson `…041` | CEO `…001` (`organisationWide: true`) | `…061` | Org-wide (no `eventId` / `clientId`) |
| Priya Nair `…045` | READ_ONLY_AUDITOR `…007` | `…065` | Org-wide |

Access Administration listing only Amara / James / Samuel is consistent with **event-scoped** assignment UI: org-wide CEO / auditor are not expected to appear as event-row assignees.

### CEO exclusion analysis

| Question | Finding |
|----------|---------|
| Is CEO org-wide exclusion intended policy? | **No** for event visibility. `canSeeEvent` returns true when any active org assignment’s role has `organisationWide: true`. CEO role on live has `organisationWide: true`. |
| Does CEO lack an event-scoped row? | **Yes** — by fixture design for CUR. That explains absence from Access Administration, not a policy ban on opening the event. |
| Is denial on CUR a confirmed product defect? | **Not proven in this remediation.** Policy evaluation against live rows says CEO should see the CUR event. Claude’s “not available in this assignment” report may reflect UI path / session / deep-link confusion, or a surface that applies a stricter check. Not investigated further because the CUR event is the wrong fixture. |
| Would granting CEO event-scoped access on CUR remediate Gate 1? | **No** — wrong fixture identity. |

## System Health sources (live `/api/health/ready` + UI)

| Displayed field | Live value | Source |
|-----------------|------------|--------|
| Application / Deployed SHA | `7f139a55…` | Embedded `EVENT_OS_GIT_SHA` / build identity |
| Deployment source SHA | `c7f76a0a…` | `RAILWAY_GIT_COMMIT_SHA` (docs tip rebuild) |
| Documentation HEAD | `8e8a6a02…` | Railway env `EVENT_OS_DOCS_HEAD` |
| Programme posture (UI) | `EOS-S06 ACCEPTED · EOS-S06A IMPLEMENTED (not accepted)` | **Hardcoded** in `apps/event-os/src/app/app/admin/system/page.tsx` — contradicts `MD-PR-S079` |
| Qualification evidence commit `5561171…` | Not shown | No System Health / release-evidence field wired |

### Provenance of `8e8a6a02…`

Valid **EOS-S06A reviewed pre-acceptance documentation/evidence tip** under `MD-PR-S079` / `EOS_S06A_ACCEPTANCE.md`. It is **not** the current repository tip (`c7f76a0a…`) and is **not** the Gate 1 qualification evidence commit (`5561171…`). Live `EVENT_OS_DOCS_HEAD` was left at the S06A reviewed tip after later documentation-only Gate 1 commits. Field mapping is correct; the env value is stale relative to current tip, not a cross-wired Application SHA.

## Findability

Events list has ~69 live events and no effective search/filter observed. The Gate 1 CAP600 fixture is absent from live, so findability remediation against live cannot surface the accepted qualification event.

## Debt observed (not remediated — stopped)

1. Hardcoded System Health programme posture still claims EOS-S06A “IMPLEMENTED (not accepted)”.
2. `EVENT_OS_DOCS_HEAD` not advanced after Gate 1 documentation tip.
3. Qualification evidence commit not exposed on release-evidence UI.
4. Events list discoverability for synthetic fixtures.
5. Access Administration does not surface org-wide assignees beside event-scoped rows (UX clarity for verifiers).

## Explicitly not done

- No assignment mutations  
- No CAP600 seed onto Railway (seed refuses production; “do not recreate fixture”)  
- No application deploy  
- No seating / solver / capacity corpus changes  
- No EOS-S06B / EOS-S07 work  
- No Control Tower touch  
- No provider / production authorisation change  
