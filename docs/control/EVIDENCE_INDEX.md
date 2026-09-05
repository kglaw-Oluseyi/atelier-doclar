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

## MD-CT5

**Prompt Control ID:** `MD-PR-0006`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-CT5-TESTS | TEST | DAG, drill-down and browser tests | `pnpm test` / `pnpm e2e` |
| EV-CT5-IMPL | DOCUMENT | Implementation record | `docs/control/CT5_IMPLEMENTATION.md` |

## MD-CT6

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-CT6-AUTH | TEST | Protected-gate negative tests | `packages/programme-tower/test/authority.test.ts` |
| EV-CT6-IMPL | DOCUMENT | Implementation record | `docs/control/CT6_IMPLEMENTATION.md` |

## MD-CT7

**Prompt Control ID:** `MD-PR-0008`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-CT7-RAG | TEST | Allow-list, citation, abstention and security tests | `packages/programme-tower/test/rag.test.ts` |
| EV-CT7-E2E | TEST | Ask surface and roadmap isolation | `apps/control-tower/e2e/ask.spec.ts` |
| EV-CT7-IMPL | DOCUMENT | Implementation record | `docs/control/CT7_IMPLEMENTATION.md` |

## MD-CT8

**Prompt Control ID:** `MD-PR-0009`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-CT8-CHARTS | TEST | Unknown≠green, dedupe and roadmap isolation | `packages/programme-tower/test/charts.test.ts` |
| EV-CT8-E2E | TEST | Charts tables and freshness | `apps/control-tower/e2e/charts.spec.ts` |
| EV-CT8-IMPL | DOCUMENT | Implementation record | `docs/control/CT8_IMPLEMENTATION.md` |

## MD-CT9

**Prompt Control ID:** `MD-PR-0010`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-CT9-OPS | TEST | Failure modes, restore, unsigned gates | `packages/programme-tower/test/ops.test.ts` |
| EV-CT9-E2E | TEST | Operations surface | `apps/control-tower/e2e/ops.spec.ts` |
| EV-CT9-RUNBOOK | DOCUMENT | Operational runbook | `docs/control/CT9_RUNBOOK.md` |
| EV-CT9-BACKUP | DOCUMENT | Snapshot restore strategy | `docs/control/BACKUP_RESTORE.md` |
| EV-CT9-IMPL | DOCUMENT | Implementation record | `docs/control/CT9_IMPLEMENTATION.md` |
| EV-CT9-SHA | COMMIT | CT9 operations evidence | `28958e31778e92c3354e72447150353939ed4596` |

## MD-FC1

**Prompt Control ID:** `MD-PR-S001`  
**Native ID:** `FC1`  
**Slice ID:** `MD-FC1`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-FC1-CLOSEOUT | DOCUMENT | Foundation closeout record | `docs/control/FOUNDATION_CLOSEOUT.md` |
| EV-FC1-DEBT | DOCUMENT | Reconciliation matrix | `docs/control/FOUNDATION_DEBT_RECONCILIATION.md` |
| EV-FC1-LIVE | DOCUMENT | Live-verification pack | `docs/control/CONTROL_TOWER_LIVE_VERIFICATION.md` |
| EV-FC1-CONFIG | DOCUMENT | Production configuration contract | `docs/control/PRODUCTION_CONFIGURATION.md` |
| EV-FC1-PERSIST | DOCUMENT | Persistence ADR | `docs/control/ADR_PRODUCTION_PERSISTENCE.md` |
| EV-FC1-AUTH | DOCUMENT | Authentication ADR | `docs/control/ADR_PRODUCTION_AUTHENTICATION.md` |
| EV-FC1-RAILWAY | DOCUMENT | Railway readiness ADR | `docs/control/ADR_RAILWAY_DEPLOYMENT.md` |
| EV-FC1-EOS | DOCUMENT | Event OS entry gate | `docs/control/EVENT_OS_ENTRY_GATE.md` |

## MD-LV1

**Prompt Control ID:** `MD-PR-S002`  
**Native ID:** `LV1`  
**Slice ID:** `MD-LV1`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-LV1-DEPLOY | DOCUMENT | Live deployment report | `docs/control/LIVE_DEPLOYMENT_REPORT.md` |
| EV-LV1-VERIFY | DOCUMENT | Automated live verification evidence | `docs/control/LIVE_VERIFICATION_EVIDENCE.md` |
| EV-LV1-RUNTIME | DOCUMENT | Runtime configuration status | `docs/control/LIVE_RUNTIME_CONFIGURATION.md` |
| EV-LV1-URL | DOCUMENT | Live Control Tower HTTPS origin | `https://control-tower-production-dbc4.up.railway.app/programme` |

## MD-HV1

**Prompt Control ID:** `MD-PR-S003`  
**Native ID:** `HV1`  
**Slice ID:** `MD-HV1`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-HV1-HUMAN | DOCUMENT | CEO human live verification | `docs/control/HUMAN_LIVE_VERIFICATION.md` |
| EV-HV1-URL | DOCUMENT | Live Control Tower reviewed by the CEO | `https://control-tower-production-dbc4.up.railway.app/programme` |

This is live-browser verification evidence. It is not formal slice acceptance, independent acceptance, or CEO production authorisation.

## EOS-S01

**Prompt Control ID:** `MD-PR-S004`  
**Native ID:** `S01`  
**Slice ID:** `EOS-S01`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-EOS-S01-IMPL | DOCUMENT | Implementation report | `docs/control/EOS_S01_IMPLEMENTATION_REPORT.md` |
| EV-EOS-S01-BOUNDARY | DOCUMENT | Shared platform ownership | `docs/control/EVENT_OS_SHARED_PLATFORM_BOUNDARY.md` |
| EV-EOS-S01-ARCH | DOCUMENT | Foundation architecture | `docs/control/EVENT_OS_FOUNDATION_ARCHITECTURE.md` |
| EV-EOS-S01-TESTS | TEST | Shared-platform isolation, concurrency, idempotency, audit | `packages/shared-platform/test/` |

Formal technical acceptance is recorded in `docs/control/EOS_S01_ACCEPTANCE.md`. Production not authorised.

## EOS-S01-ACCEPT

**Prompt Control ID:** `MD-PR-S007`  
**Native ID:** `S01-ACCEPT`  
**Slice ID:** `EOS-S01`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-EOS-S01-COMMIT | COMMIT | Immutable implementation commit | `git:b815268e939cfbd0fc33ce10df77f1c8a1374d52` |
| EVT-SEED-EOS-S01-COMMIT | EVENT | COMMIT_LINKED | programme-domain seed |
| EVT-SEED-EOS-S01-ACCEPT | EVENT | ACCEPTANCE_RECORDED by ChatGPT / AI CTO | programme-domain seed |
| EV-EOS-S01-ACCEPT-DOC | DOCUMENT | Acceptance record | `docs/control/EOS_S01_ACCEPTANCE.md` |
| EV-EOS-S01-CI | CHECK | EOS-S01 implementation CI SUCCESS | GitHub Actions `33971129315` |
| EV-GR1-CI | CHECK | MD-GR1 CI SUCCESS | GitHub Actions `33972619457` |

## MD-GR1

**Prompt Control ID:** `MD-PR-S006`  
**Native ID:** `GR1`  
**Slice ID:** `MD-GR1`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-GR1-RECONCILIATION | DOCUMENT | Dependency semantics reconciliation | `docs/control/DEPENDENCY_SEMANTICS_RECONCILIATION.md` |
| EV-GR1-DECISION | DECISION | Controlling semantic decision | `programme/decisions/DEC-MD-GR1-DEPENDENCY-SEMANTICS.yaml` |
| EV-GR1-ADR | DOCUMENT | ADR for progression semantics | `docs/control/ADR_DEPENDENCY_SEMANTICS.md` |
| EV-GR1-ENTRY-GATE | DOCUMENT | Event OS entry / progression authority | `docs/control/EVENT_OS_ENTRY_GATE.md` |
| EV-GR1-HUMAN-VERIFY | DOCUMENT | CEO human live verification PASS | `docs/control/HUMAN_LIVE_VERIFICATION.md` |
| EV-GR1-TESTS | TEST | Dependency-semantics unit and corpus tests | `packages/programme-domain/test/dependency-semantics.test.ts` |

Progression authorisation is not formal slice acceptance and not production authorisation. EOS-S01 COMMIT evidence and technical acceptance were later recorded under `MD-PR-S007`.

## EOS-S02

**Prompt Control ID:** `MD-PR-S008`  
**Native ID:** `S02`  
**Slice ID:** `EOS-S02`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-EOS-S02-COMMIT | COMMIT | Immutable implementation commit | `git:23e8ad98f7a0b8d18ae083f385bfc04cd43ab973` |
| EV-EOS-S02-IMPL | DOCUMENT | Implementation report | `docs/control/EOS_S02_IMPLEMENTATION_REPORT.md` |
| EV-EOS-S02-ARCH | DOCUMENT | Guest directory boundary | `docs/control/EVENT_OS_GUEST_DIRECTORY.md` |
| EV-EOS-S02-TESTS | TEST | Intake, directory, identity safety and adversarial controls | `packages/shared-platform/test/guest-*.test.ts` |
| EV-EOS-S02-E2E | TEST | Event OS guest directory Playwright | `apps/event-os/e2e/guests.spec.ts` |
| EV-EOS-S02-ACCEPT | DOCUMENT | Formal technical acceptance record | `docs/control/EOS_S02_ACCEPTANCE.md` |

ACCEPTED under `MD-PR-S009` by `ChatGPT / AI CTO` at `2026-09-05T23:10:00Z`. Accepted implementation remains `23e8ad98f7a0b8d18ae083f385bfc04cd43ab973`. Production not authorised.

## EOS-S03

**Prompt Control ID:** `MD-PR-S010`  
**Native ID:** `S03`  
**Slice ID:** `EOS-S03`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-EOS-S03-COMMIT | COMMIT | Implementation commit | `git:bed7cebeb14e731c1d0e8a289ceb7cfa21f546fe` |
| EV-EOS-S03-IMPL | DOCUMENT | Implementation report | `docs/control/EOS_S03_IMPLEMENTATION_REPORT.md` |
| EV-EOS-S03-ARCH | DOCUMENT | RSVP and guest self-service boundary | `docs/control/EVENT_OS_RSVP_SELF_SERVICE.md` |
| EV-EOS-S03-TESTS | TEST | RSVP domain, conflict and adversarial controls | `packages/shared-platform/test/rsvp-*.test.ts` |
| EV-EOS-S03-E2E | TEST | Event OS guest and staff RSVP Playwright | `apps/event-os/e2e/rsvp.spec.ts` |
| EV-EOS-S03-ACCEPT | DOCUMENT | Formal technical acceptance record | `docs/control/EOS_S03_ACCEPTANCE.md` |

ACCEPTED under `MD-PR-S011` by `ChatGPT / AI CTO` at `2026-09-06T01:10:00Z`. Accepted implementation remains `bed7cebeb14e731c1d0e8a289ceb7cfa21f546fe`. Production not authorised. EOS-S04 is not authorised for implementation.

## EOS-LV1

**Prompt Control ID:** `MD-PR-S012`  
**Milestone:** `EOS-LV1`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-EOS-LV1-LIVE | DOCUMENT | Event OS S01–S03 live verification record | `docs/control/EVENT_OS_S01_S03_LIVE_VERIFICATION.md` |
| EV-EOS-LV1-URL | DOCUMENT | Live Event OS HTTPS origin | `https://event-os-production-bc8d.up.railway.app` |

Automated live verification PASS. At deployment time, CEO human verification was PENDING. Production not authorised.

## EOS-HV1

**Prompt Control ID:** `MD-PR-S013`  
**Milestone:** `EOS-HV1`

| ID | Kind | Summary | Location |
|----|------|---------|----------|
| EV-EOS-S01-S03-HUMAN-VERIFICATION | DOCUMENT | CEO human live verification PASS WITH MINOR REFINEMENTS | `docs/control/EVENT_OS_S01_S03_HUMAN_VERIFICATION.md` |
| EV-EOS-LV1-LIVE | DOCUMENT | Prior live-verification record (automated PASS; CEO PENDING then closed) | `docs/control/EVENT_OS_S01_S03_LIVE_VERIFICATION.md` |

CEO / George Lawson completed the walkthrough against deployment `9cee3095-cb37-422a-be9e-ad632fa27a1b`. Blocking defects zero. Technical debt zero. Five findings recorded. Mobile human verification NOT ASSESSED. EOS-S03 acceptance identity unchanged. Production not authorised. EOS-S04 implementation not authorised.

