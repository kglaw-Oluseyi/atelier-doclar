# Requirements Traceability

**Slice:** MD-CT1  
**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0002`  
**Native ID:** `CT1`

| Requirement | Implementation |
|-------------|----------------|
| Strict TypeScript programme-domain schemas | `packages/programme-domain/src/schemas.ts` |
| Declarative slice-manifest validation | `SliceManifestSchema` + YAML/JSON loader |
| Evidence-derived SliceRecord validation | `SliceRecordSchema` |
| Manifest → programme-state mapping | `projectSliceRecord` / `assertMappingConsistency` |
| Product/phase/slice referential integrity | `referential.ts` |
| Dependency validation | `dependsOn` syntax + existence |
| Deterministic DAG cycle detection | `dag.ts` |
| Protected ACCEPTED validation | `SliceRecordSchema` superRefine |
| Deterministic normalised programme output | `normalize.ts` |
| Automated positive/negative tests | `packages/programme-domain/test/` |
| Validation command | `pnpm programme:validate` |
| Invalid programme states fail CI | `.github/workflows/programme-validate.yml` |
| Two-model law | `programme/schema/SLICE_MANIFEST_VS_RECORD.md` |

## MD-CT2

**Prompt Control ID:** `MD-PR-0003`  
**Native ID:** `CT2`  
**Slice ID:** `MD-CT2`

| Requirement | Implementation |
|-------------|----------------|
| Immutable programme events | `events.ts` + append-only `ProgrammeStore` |
| Idempotent application | store idempotency key / event identity |
| Optimistic concurrency | `expectedRevision` compare-and-append |
| Event → projection | `applyEvent` / `replay` |
| Historical reconstruction | `projectionAt` / `reconstructFromSnapshot` |
| Versioned immutable snapshots | `generateControlSnapshot` + store snapshot map |
| Evidence-derived status | `status.ts` |
| Outstanding work | `outstanding.ts` |
| Percentage without invented weights | `calculatePercentage` → `UNAVAILABLE` when weights absent |
| Protected acceptance | CT1 `SliceRecordSchema` reused; no implementer/system authority |

## MD-CT3

**Prompt Control ID:** `MD-PR-0004`  
**Native ID:** `CT3`  
**Slice ID:** `MD-CT3`

| Requirement | Implementation |
|-------------|----------------|
| GitHub provider boundary | `RepositoryEvidenceProvider` + `github-adapter.ts` |
| Repository / ref allow-list | `allowlist.ts` — `kglaw-Oluseyi/atelier-doclar` / `main` |
| Inbound payload schemas | `inbound.ts` |
| Webhook HMAC + constant-time compare | `webhook.ts` |
| Replay protection | `X-GitHub-Delivery` + `MemoryDeliveryStore` |
| Idempotent ingestion | CT2 `idempotencyKey` / `eventId` |
| Commit-to-slice linkage | `linkage.ts` + catalogue `prompt_attachments` |
| Unlinked commits remain visible | `IngestionLedger.unlinkedCommits` |
| CI success law | `completed` + `success` + trusted workflow + linked commit |
| Reconciliation | `IngestionService.reconcile` / `pnpm programme:reconcile` |
| Freshness | `freshness.ts` — unknown ≠ healthy |
| Transient vs permanent failure | `errors.ts` |
| Status remains CT2-owned | translator emits evidence events only |
| Acceptance cannot be manufactured | no `ACCEPTANCE_RECORDED` from GitHub |

## MD-CT4

**Prompt Control ID:** `MD-PR-0005`  
**Native ID:** `CT4`  
**Slice ID:** `MD-CT4`

| Requirement | Implementation |
|-------------|----------------|
| Private `/programme` | Next.js middleware + HMAC session |
| Executive portfolio | `packages/programme-tower` + `apps/control-tower` |
| Evidence-derived status | CT2 snapshot via `loadCorpusPortfolio` |
| UI states | loading/empty/denied/stale/degraded/conflict/error/recovery |
| Unknown ≠ healthy | `freshness.healthy` requires live GitHub FRESH |
| No gate approval | `cannotApprove: true`; no approve control |

## MD-CT5

| Requirement | Implementation |
|-------------|----------------|
| Data-derived DAG | `buildRoadmap` + `detectCycles` |
| Accessible table | Roadmap table equivalent |
| Product pages | `/programme/event-os` and siblings |
| Slice / evidence drill-down | `/programme/slices/[id]`, `/programme/evidence`, `/programme/commits` |

## MD-CT6

| Requirement | Implementation |
|-------------|----------------|
| Named authority | `evaluateApproval` rejects reserved/missing identities |
| No executor default approve | `/api/programme/gates/approve` |
| Append-only audit | `appendAudit` |
| Unsigned release | `buildReleaseCandidate.productionAuthorised = false` |

## MD-CT7

| Requirement | Implementation |
|-------------|----------------|
| Allow-listed sources | `isPathAllowlisted` / `buildProgrammeIndex` |
| Citations | `answerQuestion` citations table |
| Abstention | missing evidence and path probes |
| Status not RAG-owned | snapshot `authoritativeStatus` |
| RAG outage isolation | degraded answer; `buildRoadmap` still works |
| Provider unselected | `RAG_PROVIDER.vendorBound = false` |

## MD-CT8

| Requirement | Implementation |
|-------------|----------------|
| Useful charts | `buildCharts` series |
| Accessible equivalent | table per series |
| Unknown ≠ green | `toneForStatus("UNKNOWN") === "unknown"` |
| Freshness | snapshot age, last CI UNKNOWN, healthy=false |
| Notifications | `buildNotifications` + `dedupeNotifications` |
| No external provider | in-app only (`CT8-OI-001`) |

## MD-CT9

| Requirement | Implementation |
|-------------|----------------|
| Failure modes | `classifyFailure` + `ops.test.ts` |
| Snapshot restore | `restoreVerifiedSnapshot` |
| Unsigned gates | `assessHealth.productionAuthorised = false` |
| Event OS isolation | `eventOsImpliedFailed = false` |
| Runbook / backup | `docs/control/CT9_RUNBOOK.md`, `BACKUP_RESTORE.md` |

## MD-FC1

**Prompt Control ID:** `MD-PR-S001`  
**Slice ID:** `MD-FC1`

| Requirement | Implementation |
|-------------|----------------|
| Debt inventory vs repository | `docs/control/FOUNDATION_DEBT_RECONCILIATION.md` |
| Stale CT0 framework/app items | OI-CT0-001 / OI-CT0-005 RESOLVED |
| Phase.slices completeness | `referential.ts` + PH-EVENT-OS-OPERATIONS |
| GitHub live read client | `packages/programme-ingestion/src/github-http.ts` |
| Webhook HTTP route | `apps/control-tower/src/app/api/programme/github/webhook/route.ts` |
| Durable audit | `FileAuditRepository` / `MemoryAuditRepository` |
| RAG index cache | `resolveProgrammeIndex` / `ProgrammeIndexCache` |
| Health / readiness | `/api/health/live`, `/api/health/ready`, `/programme/ops` |
| Fail-closed production config | `evaluateRuntimeConfig` |
| Railway prep without deploy | `railway.toml`, `ADR_RAILWAY_DEPLOYMENT.md` |
| No manufactured acceptance | MD-B0–MD-FC1 remain IN_REVIEW |

## MD-LV1

**Prompt Control ID:** `MD-PR-S002`  
**Slice ID:** `MD-LV1`

| Requirement | Implementation |
|-------------|----------------|
| Dedicated Railway project | `atelier-doclar` / `c1c937b7-2660-4fc2-8257-c08bd6346658` |
| Durable persistence | `PostgresProgrammeStore` + Railway PostgreSQL |
| Temporary verification auth | Named actor, httpOnly Secure cookie, 2h TTL |
| Live GitHub read | `GitHubHttpProvider` with `PROGRAMME_GITHUB_LIVE=1` |
| Webhook | `POST /api/programme/github/webhook` + remote hook `674900340` |
| Health | `/api/health/live`, `/api/health/ready` |
| Human verification remains pending | Recorded later in MD-HV1; `OI-FC1-001` was OPEN at LV1 |
| Production not authorised | Protected gates unsigned |

## MD-HV1

**Prompt Control ID:** `MD-PR-S003`  
**Slice ID:** `MD-HV1`

| Requirement | Implementation |
|-------------|----------------|
| CEO human live verification | `docs/control/HUMAN_LIVE_VERIFICATION.md` — PASS, issues NONE |
| Live Control Tower reviewed | `https://control-tower-production-dbc4.up.railway.app/programme` |
| Resolve OI-FC1-001 only | `RESOLVED_BY_HUMAN_VERIFICATION`; historical YAML retained |
| Do not infer production authorisation | `OI-FC1-002`, `OI-FC1-003`, `CT4-OI-001` remain OPEN |
| Preserve IN_REVIEW | MD-B0–MD-CT9, MD-FC1, MD-LV1, MD-HV1 remain IN_REVIEW; accepted = 0 |
| Event OS unstarted | Historical at MD-HV1; EOS-S01 now executed and IN_REVIEW |

## EOS-S01

**Prompt Control ID:** `MD-PR-S004`  
**Slice ID:** `EOS-S01`

| Requirement | Implementation |
|-------------|----------------|
| Shared platform must not fork | `@maison-doclar/shared-platform` owns org/client/event/person/consent/audit IDs |
| Organisation and event scope | Server policy + store lineage; isolation tests |
| Authority separation | Person, session, membership, role, permission, assignment, approval scaffold |
| Master Event File foundation | Versioned slots for the doctrine lifecycle; later modules not built |
| Change control | expectedVersion, idempotency, append-only audit |
| No production IdP | Non-production adapter; `CT4-OI-001` remains OPEN |
| No Railway | No Event OS deploy; Control Tower live deployment unchanged |
| UI foundation | `apps/event-os` shell, clients, events, audit, access, health |
| Do not accept during implementation | Historical at MD-PR-S004; later accepted under MD-PR-S007 |

## EOS-S01-ACCEPT

**Prompt Control ID:** `MD-PR-S007`  
**Slice ID:** `EOS-S01`

| Requirement | Implementation |
|-------------|----------------|
| Link immutable implementation commit | `COMMIT_LINKED` `EVT-SEED-EOS-S01-COMMIT` → `b815268e939cfbd0fc33ce10df77f1c8a1374d52` |
| Immutable COMMIT evidence | `EV-EOS-S01-COMMIT` |
| Named reviewer | `ChatGPT / AI CTO` via `ACCEPTANCE_RECORDED` |
| Projector derives ACCEPTED | No handwritten status override |
| Progression without Foundation acceptance | Existing MD-GR1 `PROGRESSION_AUTHORISED` |
| Do not loosen EOS-S02 | Default ACCEPTANCE; becomes READY only after EOS-S01 ACCEPTED |
| Do not authorise production | Protected gates unsigned; `productionAuthorised` false |

## MD-GR1

**Prompt Control ID:** `MD-PR-S006`  
**Slice ID:** `MD-GR1`

| Requirement | Implementation |
|-------------|----------------|
| First-class dependency kinds | `SliceManifest.dependencyKinds` + `resolveDependencyKind` |
| Legacy default remains ACCEPTANCE | Undeclared slice edges still require `ACCEPTED` |
| PROGRESSION is not IN_REVIEW | `progressionSatisfied` requires `PROGRESSION_AUTHORISED` |
| Named authority only | Cursor / UNKNOWN / IMPLEMENTER / SYSTEM rejected |
| Do not special-case EOS-S01 | No EOS-S01 or MD-CT0 branch in `calculateSliceStatus` |
| Keep the DAG edge | `EOS-S01.dependsOn` remains `[MD-CT0]` |
| Do not accept Foundation | Foundation slices remain `IN_REVIEW` |
| Do not loosen EOS-S02 | Default ACCEPTANCE on EOS-S01; eligibility follows EOS-S01 ACCEPTED |
| Do not authorise production | Protected gates unsigned; `productionAuthorised` false |
| Document EOS-S01 COMMIT gap | `docs/control/DEPENDENCY_SEMANTICS_RECONCILIATION.md` |

## EOS-S02

**Prompt Control ID:** `MD-PR-S008`  
**Slice ID:** `EOS-S02`

| Requirement | Implementation |
|-------------|----------------|
| Extend shared-platform, no parallel guest truth | Operational guest / household / duplicate / intake collections on `@maison-doclar/shared-platform` |
| Person ≠ guest | Intake does not create Person; optional governed GuestReference link |
| Server-authoritative tenancy | Assignment + stored lineage; cross-org/event concealed as `NOT_FOUND` |
| Manual intake with provenance | `intakeGuest`; actor, reason, timestamps, correlation, idempotency |
| Operational directory | Event-scoped search, filter, sort, detail, amendment |
| Distinct unknown states | Qualified fields; verified overwrite requires explicit replace |
| Duplicate safety | Exact email/phone candidates; name-only suggestions; no auto-merge |
| Existing RBAC only | New guest.* permissions on the EOS-S01 catalogue |
| No production / Railway | Non-production fixtures; no deployment |
| Do not accept during implementation | Historical at MD-PR-S008; later accepted under MD-PR-S009 |

## EOS-S02 acceptance

**Prompt Control ID:** `MD-PR-S009`  
**Slice ID:** `EOS-S02`

| Requirement | Implementation |
|-------------|----------------|
| Named reviewer, not Cursor / UNKNOWN | `ChatGPT / AI CTO` via `ACCEPTANCE_RECORDED` |
| Immutable implementation commit | `23e8ad98f7a0b8d18ae083f385bfc04cd43ab973` / `EV-EOS-S02-COMMIT` |
| Final verified HEAD may differ | `927ff92908ea25761933a7b24d37396e5e4e0123` recorded separately |
| Predecessor law | EOS-S01 already ACCEPTED; default ACCEPTANCE dependency satisfied |
| Projector derives ACCEPTED | No handwritten status override as source truth |
| Accepted count exactly 2 | EOS-S01 and EOS-S02 only |
| EOS-S03 eligibility | Default ACCEPTANCE on EOS-S02; READY after acceptance; not implemented |
| Foundation / gates / production | Foundation IN_REVIEW; protected gates unsigned; `productionAuthorised = false` |
