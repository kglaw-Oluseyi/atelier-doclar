# Maison Doclar — Atelier Doclar

Controlled corpus baseline for the Maison Doclar programme.

**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Baseline slice:** MD-B0 (`f7abb431be9a15ab730b3fdd16baa8e83776c170`)  
**Latest planning slice:** MD-CT0  
**Latest implementation slice:** MD-CT4 (`IN_REVIEW`)

This repository holds the programme corpus, Control Tower planning artefacts, the programme engine, GitHub ingestion, and a private `/programme` shell. It does **not** contain product applications or a production identity provider.

## Start here

| Register | Path |
|----------|------|
| File inventory | [`docs/control/REPOSITORY_INVENTORY.json`](docs/control/REPOSITORY_INVENTORY.json) |
| Prompt register | [`docs/control/PROMPT_REGISTER.md`](docs/control/PROMPT_REGISTER.md) |
| Document authority | [`docs/control/DOCUMENT_AUTHORITY_REGISTER.md`](docs/control/DOCUMENT_AUTHORITY_REGISTER.md) |
| Duplicates and placement | [`docs/control/DUPLICATE_AND_PLACEMENT_REGISTER.md`](docs/control/DUPLICATE_AND_PLACEMENT_REGISTER.md) |
| Classification review | [`docs/control/CLASSIFICATION_REVIEW_QUEUE.md`](docs/control/CLASSIFICATION_REVIEW_QUEUE.md) |
| Implementation reality | [`docs/control/IMPLEMENTATION_REALITY_REPORT.md`](docs/control/IMPLEMENTATION_REALITY_REPORT.md) |
| Gaps | [`docs/control/REPOSITORY_GAP_REGISTER.md`](docs/control/REPOSITORY_GAP_REGISTER.md) |
| Decisions | [`docs/control/RECONCILIATION_DECISION_LOG.md`](docs/control/RECONCILIATION_DECISION_LOG.md) |
| Layout map (no moves) | [`docs/control/CORPUS_LAYOUT.md`](docs/control/CORPUS_LAYOUT.md) |
| CT0 preflight | [`docs/control/CT0_PREFLIGHT_REPORT.md`](docs/control/CT0_PREFLIGHT_REPORT.md) |
| Programme roadmap | [`docs/control/PROGRAMME_ROADMAP.md`](docs/control/PROGRAMME_ROADMAP.md) |
| Prompt execution map | [`docs/control/PROMPT_EXECUTION_MAP.md`](docs/control/PROMPT_EXECUTION_MAP.md) |
| Execution compatibility | [`docs/control/EXECUTION_COMPATIBILITY_REGISTER.md`](docs/control/EXECUTION_COMPATIBILITY_REGISTER.md) |
| Planning manifests | [`programme/`](programme/) |
| CT1 implementation | [`docs/control/CT1_IMPLEMENTATION.md`](docs/control/CT1_IMPLEMENTATION.md) |

## Programme validation (CT1)

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm programme:validate
pnpm programme:project
pnpm programme:ingest:verify
pnpm programme:reconcile
pnpm e2e
```

Packages: `@maison-doclar/programme-domain` and `@maison-doclar/programme-ingestion`.

## Rules

- Original corpus folders are preserved in place.
- Historical prompt packs are inventoried, not executed.
- Do not start CT5 from this baseline without a new instruction.
- The only authorised GitHub destination is `kglaw-Oluseyi/atelier-doclar`.
