# CT1 Implementation — Programme domain and manifest validator

**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0002`  
**Native ID:** `CT1`  
**Slice ID:** `MD-CT1`  
**Status:** `IN_REVIEW`  
**Baseline:** `c77f0b6c25a574ddfd70fb86dce7ec8533812a9f`

This slice implements validation and mapping only. It does not implement Control Tower UI, persistence, auth, ingestion, or CT2.

## Package

| Item | Path |
|------|------|
| Workspace root | `package.json`, `pnpm-workspace.yaml` |
| Domain package | `packages/programme-domain/` |
| Package name | `@maison-doclar/programme-domain` |
| Schemas | `packages/programme-domain/src/schemas.ts` |
| Loader | `packages/programme-domain/src/load.ts` |
| Mapping | `packages/programme-domain/src/mapping.ts` |
| DAG | `packages/programme-domain/src/dag.ts` |
| Referential checks | `packages/programme-domain/src/referential.ts` |
| Normaliser | `packages/programme-domain/src/normalize.ts` |
| CLI | `packages/programme-domain/src/cli.ts` |
| Tests | `packages/programme-domain/test/` |

## Commands

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm programme:validate
```

`pnpm programme:validate` loads the controlled corpus, validates schemas, references and the DAG, and exits non-zero on failure.

## Schemas

Implemented Zod schemas:

- `Product`, `Phase`
- `SliceManifest` (declaration)
- `SliceRecord` (evidence-derived projection)
- `Dependency`, `EvidenceRef`, `CommitRef`
- `Check`, `OpenItem`, `Decision`, `Gate`, `Approval`
- `ProgrammeSnapshot`, `TimelineEvent`

Enums preserved from the ratified model: `ProductCode`, `WorkStatus`, `GateStatus`.

## Manifest vs SliceRecord

The two objects remain distinct.

- Manifest owns the declared work contract, including `verification`.
- SliceRecord copies planning fields and adds `status`, `commits`, `evidence`, `openItems`, `acceptedAt`, `acceptedBy`, `updatedAt`, `version`.
- `projectSliceRecord(manifest, operationalState)` is the only mapping boundary.
- Planning-field drift is `MAPPING_INCONSISTENT`.

JSON `null` on optional acceptance fields is treated as absent. That is a serialization adapter, not a domain coercion.

## Error model

Structured errors use:

`code` · `entityType` · `entityId` · `field` · `value` · `message` · `sourceFile`

Codes: `SCHEMA_INVALID`, `REFERENCE_NOT_FOUND`, `DUPLICATE_ID`, `DEPENDENCY_CYCLE`, `ACCEPTANCE_EVIDENCE_MISSING`, `MAPPING_INCONSISTENT`, `DUPLICATE_EDGE`, `INVALID_IDENTITY`.

Cycle paths are returned as `A → B → C → A`.

## Normalisation

Stable order:

- products by controlled product-code order;
- phases by `order` then `id`;
- slices/records by product order, then `order`, then `id`;
- dependencies by `from` then `to`;
- evidence by `id`.

Normalised output contains no generated clock.

## Schema-drift prevention

`SliceManifest` implements `claude handover/roadmap_control_tower_addendum/schema/slice-manifest.schema.json`.  
`packages/programme-domain/test/contract.test.ts` asserts required fields, `additionalProperties: false`, ID pattern, product enum and minItems.  
Historical `contracts/programme-control.ts` remains documentary. The executable authority is this package.

## Test matrix

Positive: smallest manifest; Foundation MD-CT1; current CT0 corpus; multi-product DAG; non-accepted SliceRecord; accepted SliceRecord with complete evidence.

Negative: malformed ID; invalid product; missing phase; missing dependency; duplicate slice/product/phase; self/two-node/multi-hop cycles; unknown prohibited property; missing canonicalRefs; empty exitCriteria; ACCEPTED without acceptedAt/acceptedBy/commit/evidence; invalid SHA/timestamp/hash/gate status; orphan open item; mapping inconsistency.

## Known limitations

- Decision/Approval/Check/Timeline have identity schemas only; no CT0 YAML corpus.
- `phase.slices` is an optional annotation and is not required to list every slice.
- This package does not persist snapshots, ingest Git/CI, or approve gates.

## Open items

`CT1-OI-001` · `CT1-OI-002` · `CT1-OI-003`
