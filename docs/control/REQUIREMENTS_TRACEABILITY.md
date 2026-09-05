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
