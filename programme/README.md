# Programme planning structure

**Created in:** MD-CT0  
**Validated by:** MD-CT1 (`packages/programme-domain`, `pnpm programme:validate`)  
**Status:** Planning declarations plus CT1 schema/DAG validation. **Not a Control Tower application.**

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
