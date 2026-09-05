# Roadmap Data Dictionary

**Slice:** MD-CT0  
**Sources:** Control Tower addendum §2–§3 and §11; Zod `programme-control.ts`; JSON slice-manifest schema.

## Status words (do not collapse)

| Word | Meaning | Authoritative test |
|------|---------|-------------------|
| Planned | A valid reviewed slice manifest exists in Git | Manifest present |
| Implemented | Expected files and a coherent commit exist; required checks ran | Commit + checks |
| Accepted | Named reviewer, immutable commit, required evidence, exit criteria | SliceRecord acceptance rule |
| Product complete | All mandatory slices and product gates accepted; no blocking open item | Calculated |
| Production-ready | Independent, specialist, live-validation and CEO gates approved and unexpired | Gate records |
| Outstanding | Dependency-unlocked unaccepted slices plus open/blocking items | Calculated |
| Changed | Immutable timeline of manifest/commit/check/evidence/decision/gate events | Snapshot diff |
| Unknown | Source missing or stale | Must not render as healthy/green |

Commit exists ≠ accepted. Code exists ≠ complete. Prompt executed ≠ accepted. Unknown ≠ healthy.

## WorkStatus (SliceRecord)

`NOT_STARTED` · `READY` · `IN_PROGRESS` · `BLOCKED` · `IN_REVIEW` · `ACCEPTED` · `SUPERSEDED`

`ACCEPTED` requires `acceptedAt`, `acceptedBy`, `commits.length ≥ 1`, `evidence.length ≥ 1`.

## GateStatus

`NOT_READY` · `EVIDENCE_INCOMPLETE` · `READY_FOR_REVIEW` · `APPROVED` · `REJECTED` · `EXPIRED`

Cursor cannot move a protected gate to `APPROVED`.

## ProductCode

`FOUNDATION` · `EVENT_OS` · `EVENT_DAY` · `ACADEMY` · `MARKETING` · `USHERING` · `INTEGRATION`

## Prompt compatibility status (CT0 map)

`READY_AS_WRITTEN` · `READY_WITH_EXECUTION_WRAPPER` · `REQUIRES_RECONCILIATION` · `BLOCKED_BY_DEPENDENCY` · `SUPERSEDED_BY_LATER_REQUIREMENT` · `REFERENCE_ONLY` · `UNKNOWN`

`SUPERSEDED_BY_LATER_REQUIREMENT` is unused in CT0 because no execution prompt in the 693 has an explicit supersession record. Event-Day v1 is a missing pack, not a registered prompt.

## Identity

| Term | Rule |
|------|------|
| Slice ID | `^[A-Z]+-[A-Z0-9-]+$` |
| Prompt Control ID | `MD-PR-NNNN` — never recycled |
| Native prompt ID | Preserved; qualify as `PRODUCT \| MD-PR-NNNN \| native` |
| Academy alias | `G0-P09[NO_NATIVE_ID]` style — descriptive only |

## Evidence kinds

`COMMIT` · `CHECK` · `TEST` · `SCREENSHOT` · `LOG` · `DOCUMENT` · `DECISION` · `APPROVAL` · `REHEARSAL` · `PILOT`

## Freshness (ratified targets, not implemented)

Repository/CI visible within five minutes of trusted event; RAG index within 24 hours of accepted canonical change; stale snapshots labelled, never silent.

## Freshness / authority fields on documents

| Field | Meaning |
|-------|---------|
| Embedded source status | Historical wording inside the file |
| Current programme authority | B0/CT0 classification |
| Authority basis | Why the current classification was recorded |
