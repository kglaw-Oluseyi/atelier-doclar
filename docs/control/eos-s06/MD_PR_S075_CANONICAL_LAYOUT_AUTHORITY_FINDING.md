# MD-PR-S075 — Canonical layout authority finding

**Packet:** A — accepted-contract truth map  
**Status:** STOP — neither authorised Path 1 nor Path 2 is present  
**Product code changed:** no  
**Date:** 2026-09-13

Parent: `docs/control/eos-s06/MD_PR_S075_EOS_S06_V2_TABLE_IDENTITY_COMPILER_AND_FEASIBILITY_TRUTH.md`  
Parent SHA-256: `faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0`  
Addendum: `docs/control/eos-s06/MD_PR_S075_ADDENDUM_CANONICAL_CURRENT_LAYOUT_AUTHORITY.md`  
Addendum SHA-256: `1451974301041c4632c3c6c7fcf20d715fddabc729ea8bf1eb19cae15186d479`

This document records the read-only contract trace required before any layout-authority implementation. It does not invent latest-by-timestamp authority.

---

## 1. Currently accepted authority rule

**Layout publication currentness is layout-lineage-specific, not event-wide.**

`publishLayoutOnSnap` (`packages/shared-platform/src/layout-assurance-operations.ts`) makes a publication `CURRENT` only after an approval bound to the exact current layout hash. It treats an existing `CURRENT` row with the same `layoutId` and hash as idempotent replay. It demotes only other `CURRENT` rows for **that same `layoutId`**:

```778:807:packages/shared-platform/src/layout-assurance-operations.ts
  const existingCurrent = snap.layoutPublications.find(
    (item) => item.layoutId === layout.id && item.status === "CURRENT" && item.contentHash === layout.contentHash,
  );
  if (existingCurrent) return existingCurrent;
  const previous = snap.layoutPublications.filter((item) => item.layoutId === layout.id && item.status === "CURRENT");
  // ...
    supersedesPublicationId: previous[0]?.id,
  // ...
  for (const item of previous) {
    item.status = "SUPERSEDED";
```

`withdrawLayoutPublicationOnSnap` withdraws by publication id inside the same layout lineage.

The accepted S05 downstream contract is the same scope. `buildLayoutDownstreamProjection` requires `organisationId`, `eventId` **and `layoutId`**, then selects `status === "CURRENT"` for that triple:

```306:322:packages/shared-platform/src/layout-assurance-projections.ts
export function buildLayoutDownstreamProjection(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  layoutId: string,
  revealSensitive: boolean,
): LayoutDownstreamProjection {
  const publication = snap.layoutPublications.find(
    (item) =>
      item.layoutId === layoutId &&
      item.eventId === eventId &&
      item.organisationId === organisationId &&
      item.status === "CURRENT",
  );
  if (!publication) {
    throw new PlatformError("NOT_FOUND", "no current publication exists for downstream consumption");
  }
```

The Event OS HTTP current-publication route is likewise lineage-specific:  
`apps/event-os/src/app/api/events/[eventId]/layouts/[layoutId]/publication/current/route.ts`  
→ `PlatformService.getLayoutDownstreamProjection(actor, organisationId, eventId, layoutId)`.

S05 ADR `docs/control/ADR_EOS_S05_VENUE_LAYOUT.md` models `Event → EventVenue → Layout → Publication (CURRENT / SUPERSEDED / WITHDRAWN)`. An event may have many layouts. Each layout has its own publication lineage. Downstream “projects current publication” of the layout being read.

Layout identity fields on `LayoutPublicationSchema` (`layout-assurance-schemas.ts`): `organisationId`, `clientId`, `eventId`, `layoutId`, `publicationNumber`, `contentHash`, `revisionId`, `approvalId`, `status`, `purpose` (only `"EVENT_LAYOUT"`), `supersedesPublicationId`, `publishedByPersonId`, `publishedAt`, version stamps. There is no event-level “governing layout id” field.

`purpose: "EVENT_LAYOUT"` is a single-value enum default. It does not select among layouts on an event.

---

## 2. Currentness is layout-lineage-specific

| Surface | Scope of `CURRENT` |
|---|---|
| `publishLayoutOnSnap` / withdraw | `layoutId` |
| `buildLayoutDownstreamProjection` | `organisationId + eventId + layoutId` |
| `buildPublishedLayoutViewer` | same |
| `comparePublishedToDraft` | `layout.id` |
| Layout assurance UI `currentPublication` | first `assurance.publications` row with `status === "CURRENT"` for **that layout page** |
| Layout list `publicationStatus` | latest publication **for that layout id** (`venue-projections.ts`) |
| Layout validation current publication | `layoutId` |
| S06 seating adapter | `organisationId + eventId` only — **not** `layoutId` |

Journey tests assert one `CURRENT` **per layout**, not per event (`layout-assurance-journeys.test.ts` after successor publish: prior same-`layoutId` row is `SUPERSEDED`).

---

## 3. Why multiple layout-lineage `CURRENT` publications can coexist for one event

Publishing layout B does not inspect or demote layout A’s `CURRENT` row. There is no event-wide unique constraint on `layoutPublications`.

`PlatformSnapshot.layoutPublications` is an in-snapshot array (`store.ts`). PostgreSQL persist treats it as a snapshot collection (`postgres-store.ts` collection list includes `"layoutPublications"`). Unique-`CURRENT` demotion exists for **seating** publications (`seating_publications` / `seating_v2_publications` by organisation+event), not for layout publications.

Hydrate/replay therefore preserves every historic `CURRENT` row that the write path left in place. A second layout on the same event can be published current without touching the first.

---

## 4. Exact Seating selector that chooses the first row

```112:120:packages/shared-platform/src/seating-adapters.ts
export function snapshotLayoutAdapter(snap: PlatformSnapshot, organisationId: string, eventId: string): PublishedSpatialLayout {
  const publication = snap.layoutPublications.find(
    (item) => item.eventId === eventId && item.organisationId === organisationId && item.status === "CURRENT",
  );
  if (!publication) {
    throw new PlatformError("DEPENDENCY_UNAVAILABLE", "no current layout blocks freeze", {
      publicMessage: "Upstream event information changed. Review and run again.",
    });
  }
```

This is unordered `.find()`. Array order, insertion order, timestamp and UUID are not stated as authority and must not be treated as such.

Callers that inherit this choice:

- `seating-v2-package.ts` `finishSeatingV2Package` / package compile
- `seating-v2-command-service.ts` freeze and table-existence checks
- `seating-v2-workspace.ts` workspace tables/capacity
- `seating-workspace.ts` v1 workspace
- `seating-command-service.ts` v1 freeze
- `seating-evaluation-v2-runner.ts` corpus fixtures (Alpha One)

S06 adapter interface `LayoutPublicationAdapter.loadCurrentLayout(eventId)` is event-scoped and does not take `layoutId`. S06 accepted contract map (`docs/control/eos-s06/EOS_S06_ACCEPTED_CONTRACT_MAP.md` §3) maps “CURRENT publication” to `buildLayoutDownstreamProjection` **and** to `loadCurrentLayout(eventId)`. Those two anchors do not have the same arity.

---

## 5. The canonical downstream projection does not resolve one event layout

`buildLayoutDownstreamProjection` cannot be called without `layoutId`. It does not scan the event for a single governing publication. It does not rank lineages. If the named layout has no `CURRENT` row it throws `NOT_FOUND`. If two layouts on the same event each have `CURRENT`, both projections succeed independently.

There is no accepted function that returns “the” event layout.

`layoutDownstreamForbidden` (`seating-adapters.ts`) is a no-op documenting that seating must not write layout records.

---

## 6. Every affected consumer

### Lineage-scoped (accepted S05)

- `buildLayoutDownstreamProjection`
- `buildPublishedLayoutViewer`
- `PlatformService.getLayoutDownstreamProjection` / `getPublishedLayoutViewer`
- HTTP `.../layouts/[layoutId]/publication/current`
- `comparePublishedToDraft`
- `buildLayoutAssuranceWorkspace` / Event OS layout page (`layout-assurance-workspace.tsx`)
- `venue-projections.ts` per-layout `publicationStatus`
- export marking when a current publication exists for that layout
- layout validation current-publication lookup

### Event-scoped first-row (S06 defect surface)

- `snapshotLayoutAdapter` and every seating compile/workspace/eval caller listed in §4

### Not in scope (different ledgers)

- Seating plan publications (`seating_v2_publications` unique CURRENT per event)
- Risk dossier publications (one CURRENT per event by S05B contract)
- Protection dossier UI `currentPublication`

---

## 7. Persistence constraints and missing constraints

Present:

- Optimistic `expectedVersion` / `expectedRevisionNumber` on publish
- Hash-bound approval required
- Same-layout idempotent replay of the identical current hash
- Same-layout supersession of prior `CURRENT`
- Seating (not layout) unique CURRENT per organisation+event

Absent:

- Partial unique index for one layout `CURRENT` per event
- Partial unique index for one layout `CURRENT` per layout lineage at the SQL layer (memory/snap enforce lineage demotion only in `publishLayoutOnSnap`)
- Event-level governing-layout pointer
- Migration/hydrate classifier for historic multiple-current rows
- Typed `ABSENT` / `AMBIGUOUS` seating outcomes (`NO_CURRENT_LAYOUT_PUBLICATION`, `MULTIPLE_CURRENT_LAYOUT_PUBLICATIONS` are not in `PLATFORM_ERROR_CODES`)

Historic ambiguous rows: preserved as written. Seating does not reject them. It selects the first matching array row.

---

## 8. Treatment required for historic ambiguous rows

Until AI CTO names Path 1 or Path 2 (or a later ratified rule):

- Do not silently choose, sort, or delete historic live rows.
- Do not auto-demote by timestamp.
- Do not repair with SQL.
- Do not treat a one-layout synthetic event as proof that multi-layout authority is fixed.

The addendum’s later packets prescribe explicit classification and fail-closed seating **after** an authorised path exists. They are not opened here.

---

## 9. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Pick first / last array row | Storage order is not authority. This is the live defect. |
| Pick latest `publishedAt` / `updatedAt` | Addendum forbids inventing latest-by-timestamp authority. |
| Lexicographically greatest id/hash | Not an accepted rule. |
| Event-wide unique CURRENT invented here | Would be Path 1 **implementation**, but Path 1 is not established by the S05 write/read contract (many layouts, each may be CURRENT). |
| Bind seating to `buildLayoutDownstreamProjection` without a layout id | The function cannot be called that way. That would be inventing a selector. |
| One-layout test events as product correction | Already proven insufficient by Section 12; addendum forbids it. |

---

## 10. Path decision (A.4)

**Path 1 — one event-governing publication already defined.**  
Not established. S05 publication, projection, HTTP and ADR are lineage-specific. Journey tests allow one CURRENT per layout. No event-level pointer exists.

**Path 2 — multiple current lineages valid, and the downstream projection already returns one canonical event layout.**  
First clause is the accepted S05 write/read behaviour. Second clause is false: the projection requires `layoutId` and does not choose among lineages.

**Path 3.** Forbidden.

S06’s `loadCurrentLayout(eventId)` and the contract-map row that cites both the layoutId projection and the event-only adapter are **contradictory**, not a resolution. Packet A requires stop for AI CTO review rather than inventing which lineage seating must consume.

---

## 11. Baseline recorded with this finding

| Item | Value |
|---|---|
| Local HEAD / `origin/main` / GitHub `main` | `27e917e9a069cebfaebbfca85c10ca66b36eaac3` |
| Candidate ancestry includes `27e917e9…` | yes |
| Worktree besides this finding | addendum at the required path; untracked helpers `apps/event-os/e2e/s075-live.spec.ts`, `apps/event-os/e2e/s075-provision.ts` (not deleted, not committed, not relied upon for a product fix) |
| Live Event OS SHA | `27e917e9a069cebfaebbfca85c10ca66b36eaac3` |
| `productionAuthorised` | `false` |
| Providers | all `INACTIVE` |
| Control Tower | unmoved |
| Parent SHA-256 | `faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0` |

---

## 12. Stop

No product code, migration, solver, validator, or seating-adapter change is authorised from this finding. Packets B–G are not started. Section 13 is not resumed.
