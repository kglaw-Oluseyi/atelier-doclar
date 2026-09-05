# Requirements Traceability

**Slice:** MD-CT1  
**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0002`  
**Native ID:** `CT1`

| Requirement | Implementation |
|-------------|----------------|
| Strict TypeScript programme-domain schemas | `packages/programme-domain/src/schemas.ts` |
| Declarative slice-manifest validation | `SliceManifestSchema` + YAML/JSON loader |
| Evidence-derived SliceRecord validation | `SliceRecordSchema` |
| Manifest → programme-state mapping | `projectSliceRecord` / `assertMappingConsistency` |
| Product/phase/slice referential integrity | `referential.ts` |
| Dependency validation | `dependsOn` syntax + existence |
| Deterministic DAG cycle detection | `dag.ts` |
| Protected ACCEPTED validation | `SliceRecordSchema` superRefine |
| Deterministic normalised programme output | `normalize.ts` |
| Automated positive/negative tests | `packages/programme-domain/test/` |
| Validation command | `pnpm programme:validate` |
| Invalid programme states fail CI | `.github/workflows/programme-validate.yml` |
| Two-model law | `programme/schema/SLICE_MANIFEST_VS_RECORD.md` |

## MD-CT2

**Prompt Control ID:** `MD-PR-0003`  
**Native ID:** `CT2`  
**Slice ID:** `MD-CT2`

| Requirement | Implementation |
|-------------|----------------|
| Immutable programme events | `events.ts` + append-only `ProgrammeStore` |
| Idempotent application | store idempotency key / event identity |
| Optimistic concurrency | `expectedRevision` compare-and-append |
| Event → projection | `applyEvent` / `replay` |
| Historical reconstruction | `projectionAt` / `reconstructFromSnapshot` |
| Versioned immutable snapshots | `generateControlSnapshot` + store snapshot map |
| Evidence-derived status | `status.ts` |
| Outstanding work | `outstanding.ts` |
| Percentage without invented weights | `calculatePercentage` → `UNAVAILABLE` when weights absent |
| Protected acceptance | CT1 `SliceRecordSchema` reused; no implementer/system authority |
