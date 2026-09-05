# Programme planning structure

**Created in:** MD-CT0  
**Validated by:** MD-CT1 (`pnpm programme:validate`)  
**Projected by:** MD-CT2 (`pnpm programme:project`)  
**Status:** Planning declarations plus CT1 validation and CT2 event/status projection. **Not a Control Tower application.**

| Path | Role |
|------|------|
| `products/` | Stable product records |
| `phases/` | DAG phases |
| `slices/catalog.json` | Slice **manifests** (declaration) |
| `slices/foundation/*.yaml` | Foundation manifests for CT1 to load |
| `slices/state-projection.json` | SliceRecord-like projections (no ACCEPTED) |
| `gates/` | Unsigned gates |
| `open-items/` | Known CT0 blockers |
| `schema/` | Manifest vs record boundary and cycle report |

Do not treat presence of these files as product completeness.
