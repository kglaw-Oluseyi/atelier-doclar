# Milestone 5 dependency SBOM (package inventory substitute)

Format: SPDX-like textual inventory (no syft/trivy available).

## Python (production worker — hash-pinned)

Source: `apps/event-os-solver-worker/python/requirements.linux.hashes.txt`

Primary:
- ortools==9.15.6755 (Apache-2.0) + transitive wheels with sha256 pins
- Installation: `pip install --require-hashes -r requirements.linux.hashes.txt`

## Node (worker supervisor runtime)

Source: `apps/event-os-solver-worker/package.json` + `npm install --omit=dev` in image
Inventory snapshot: `NODE_DEPENDENCY_INVENTORY.json`

## Bases

- python:3.12.14-slim-bookworm@sha256:9c47360a2a0355e2da18516d0b1c2126ec22c195d2185e97347c9d98398c5bef
- Node official linux-x64 20.19.0 tarball sha256:b4e336584d62abefad31baecff7af167268be9bb7dd11f1297112e6eed3ca0d5

## Exclusions from production image

- fake_malformed_child.py, crash_child.py
- spike/, test/, scripts/
- qualification corpora
