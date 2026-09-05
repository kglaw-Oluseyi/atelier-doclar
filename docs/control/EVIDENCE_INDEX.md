# Evidence Index

**Slice:** MD-CT1  
**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0002`  
**Native ID:** `CT1`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-CT1-TYPECHECK | CHECK | Strict TypeScript compile of programme-domain | `pnpm typecheck` |
| EV-CT1-TESTS | TEST | Unit and corpus validation tests | `pnpm test` |
| EV-CT1-VALIDATE | CHECK | Full programme manifest + DAG validation | `pnpm programme:validate` |
| EV-CT1-CI | DOCUMENT | Least-privilege GitHub Actions workflow | `.github/workflows/programme-validate.yml` |
| EV-CT1-IMPL | DOCUMENT | Implementation record | `docs/control/CT1_IMPLEMENTATION.md` |

Acceptance of MD-CT1 still requires a named reviewer. This index is evidence of implementation, not acceptance.

## MD-CT2

**Prompt Control ID:** `MD-PR-0003`  
**Native ID:** `CT2`  
**Slice ID:** `MD-CT2`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-CT2-TYPECHECK | CHECK | Strict TypeScript compile including CT2 modules | `pnpm typecheck` |
| EV-CT2-TESTS | TEST | Event, store, replay, status and snapshot tests | `pnpm test` |
| EV-CT2-VALIDATE | CHECK | Programme corpus still valid | `pnpm programme:validate` |
| EV-CT2-PROJECT | CHECK | Event projection and outstanding-work calculation | `pnpm programme:project` |
| EV-CT2-IMPL | DOCUMENT | Implementation record | `docs/control/CT2_IMPLEMENTATION.md` |

Acceptance of MD-CT2 still requires a named reviewer. Not ACCEPTED.

## MD-CT3

**Prompt Control ID:** `MD-PR-0004`  
**Native ID:** `CT3`  
**Slice ID:** `MD-CT3`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-CT3-TYPECHECK | CHECK | Strict TypeScript compile including programme-ingestion | `pnpm typecheck` |
| EV-CT3-TESTS | TEST | Webhook, allow-list, ingest, reconcile and CT2 integration tests | `pnpm test` |
| EV-CT3-VALIDATE | CHECK | Programme corpus still valid | `pnpm programme:validate` |
| EV-CT3-PROJECT | CHECK | Event projection including CT3 seed review state | `pnpm programme:project` |
| EV-CT3-INGEST | CHECK | Synthetic webhook and reconcile self-check | `pnpm programme:ingest:verify` / `pnpm programme:reconcile` |
| EV-CT3-IMPL | DOCUMENT | Implementation record | `docs/control/CT3_IMPLEMENTATION.md` |

Acceptance of MD-CT3 still requires a named reviewer. Not ACCEPTED.

## MD-CT4

**Prompt Control ID:** `MD-PR-0005`  
**Native ID:** `CT4`  
**Slice ID:** `MD-CT4`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-CT4-TYPECHECK | CHECK | Strict TypeScript including control-tower | `pnpm typecheck` |
| EV-CT4-TESTS | TEST | Session, portfolio and surface-state tests | `pnpm test` |
| EV-CT4-E2E | TEST | Playwright + axe portfolio checks | `pnpm e2e` |
| EV-CT4-IMPL | DOCUMENT | Implementation record | `docs/control/CT4_IMPLEMENTATION.md` |

Acceptance of MD-CT4 still requires a named reviewer. Not ACCEPTED.

