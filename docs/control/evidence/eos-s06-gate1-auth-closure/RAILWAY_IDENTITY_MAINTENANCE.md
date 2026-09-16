# Railway identity-maintenance evidence

| Field | Value |
|-------|-------|
| Variable mutated | `EVENT_OS_GIT_SHA` only |
| Prior value | `0a0be803f123e8326fb893db1e3562c724b70dd0` |
| New value | `71317881384e38671295c3fda32d533c71c3f559` |
| Configuration-maintenance deployment | `9d069fbd-b09e-4cde-b9d9-da758f0744db` SUCCESS |
| Prior remediation deployment | `815dea7a-9ece-4165-be33-a7c9e5abb640` (REMOVED after identity rebuild) |
| Post-identity `/api/health/ready` | ready=true; applicationSha=`7131788…`; deploymentSourceSha=`7131788…`; documentationHead=`0a0be80…` (EVENT_OS_DOCS_HEAD unchanged); productionAuthorised=false; persistence=POSTGRES; migrations=APPLIED |

This rebuild is **configuration-maintenance**, not a new product-code deployment claim.
