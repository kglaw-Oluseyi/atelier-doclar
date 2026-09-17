# Dependency and licence — Checkpoint 1 proven

| Component | Pin | Evidence |
|-----------|-----|----------|
| Python | 3.12.13 (local spike); Docker `python:3.12.10-slim-bookworm` | `apps/event-os-solver-worker/.venv` / Dockerfile |
| OR-Tools | `ortools==9.15.6755` | Official PyPI; Apache-2.0 |
| Linux x86_64 wheel (cp312) | `ortools-9.15.6755-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl` | sha256 `033836c0eb33bc72697a299e0caedbb25fc9d1cee0b13832d69cb30405f57b3e` |
| macOS arm64 wheel (cp312, spike host) | `ortools-9.15.6755-cp312-cp312-macosx_11_0_arm64.whl` | sha256 `1e16686c2b457fa6242c474ab890ee1712347ab53678e0d2fab307ae03e97a4b` |
| Node supervisor | Node.js 20 / TypeScript (repo standard) | `apps/event-os-solver-worker/package.json` |
| Licence | Apache-2.0 (OR-Tools / Google LLC) | https://pypi.org/project/ortools/9.15.6755/ |

**Rejected:** unofficial Node OR-Tools bindings; WebAssembly CP-SAT; custom heuristic as authoritative engine.

Transitive spike freeze: `apps/event-os-solver-worker/python/requirements.txt`.
