# Slice manifest vs SliceRecord — responsibility boundary

**Slice:** MD-CT0  
**Decision:** CT0-D-SCHEMA  
**Sources:** `claude handover/roadmap_control_tower_addendum/schema/slice-manifest.schema.json`, `claude handover/roadmap_control_tower_addendum/contracts/programme-control.ts`

These two ratified representations are **related but distinct**. CT0 does not make them identical and does not delete fields from either.

## Manifest (declaration)

**File:** `slice-manifest.schema.json`  
**Role:** Declared work contract. What must be true for a slice to be planned.

Required fields: `id`, `product`, `title`, `phaseId`, `order`, `dependsOn`, `canonicalRefs`, `outcome`, `entryCriteria`, `exitCriteria`, `expectedFiles`, `verification`.

`additionalProperties: false` is intentional for the declaration document. It must not silently grow operational fields.

CT0 planning manifests live in `programme/slices/catalog.json` and `programme/slices/foundation/*.yaml`.

## SliceRecord (projection)

**File:** `contracts/programme-control.ts` (`SliceRecord`)  
**Role:** Evidence-derived programme-state projection.

Adds operational fields the manifest must not own: `status`, `commits`, `evidence`, `openItems`, `acceptedAt`, `acceptedBy`, `updatedAt`, `version`.

Acceptance rule (ratified): status `ACCEPTED` is invalid without named reviewer, timestamp, at least one commit, and at least one evidence record.

CT0 projections live in `programme/slices/state-projection.json`. **No slice is marked ACCEPTED.**

## Mapping principle

| Manifest field | SliceRecord field | Direction |
|----------------|-------------------|-----------|
| Identity/planning fields | Copied as the declared contract | Manifest → record |
| *(absent)* | `status`, `commits`, `evidence`, acceptance metadata | Calculated from Git/CI/review events |
| `verification` | Not a SliceRecord field | Remains declaration-only; CT1 must preserve it on the manifest side |
| *(absent)* | `openItems` | Record references open-item IDs |

CT1 implements loaders and validators for **both** models and the mapping. It must not collapse them into one schema.

## What CT1 may implement

1. Parse/validate manifests against the JSON Schema.
2. Parse/validate SliceRecords against Zod.
3. Project a SliceRecord from a valid manifest plus empty operational state.
4. Reject `ACCEPTED` without identity/commit/evidence.
5. Detect dependency cycles on `dependsOn`.
6. Fail CI when referential integrity fails.

CT1 may not invent a third competing slice model.
