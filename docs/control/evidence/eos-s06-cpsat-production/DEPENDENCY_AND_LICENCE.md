# Dependency and licence — Checkpoint 1 target

Exact pins are proven during the Checkpoint 1 architecture spike and recorded here when measured.

| Component | Target | Notes |
|-----------|--------|-------|
| Language | Python 3.11+ (pin at spike) | Child runtime only |
| Solver | Google OR-Tools CP-SAT (pin exact version + wheel hash) | Official distribution only |
| Supervisor | Node.js 20 / TypeScript (repo standard) | No unofficial Node OR-Tools binding |
| Licence | OR-Tools Apache-2.0 (confirm at pin) | Record SBOM / licence text path |

Unofficial Node bindings, WebAssembly experiments and custom heuristic substitutes are **rejected** for authoritative production use.
