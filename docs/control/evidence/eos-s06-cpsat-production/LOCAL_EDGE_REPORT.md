# Local-edge report — Checkpoint 1 feasibility

| Requirement | Checkpoint 1 finding |
|-------------|----------------------|
| Same signed worker image | Dockerfile at `apps/event-os-solver-worker/Dockerfile` builds supervisor + Python child; intended for central and edge |
| Offline operation | Child has no network credentials; framed stdin/fd3 only; PG claim loop is local-capable (P2) |
| Reference hardware | Prefer matching x86-64 for replay equivalence (pack requirement); local spike measured on macOS arm64 for architecture proof only |
| Central↔edge replay | Deferred to P9; packaging path exists |
| Holder-epoch transfer | Deferred to P9; architecture does not preclude it |

**Feasibility:** **YES** for packaging. Full drill not claimed.
