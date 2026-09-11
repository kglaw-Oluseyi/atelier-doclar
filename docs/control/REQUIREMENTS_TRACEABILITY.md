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
| EOS-S03 eligibility | Default ACCEPTANCE on EOS-S02; READY after acceptance; implemented under MD-PR-S010 |

## EOS-S03

**Prompt Control ID:** `MD-PR-S010`
**Slice ID:** `EOS-S03`

| Requirement | Implementation |
|-------------|----------------|
| Native prompts S3-01–S3-50 | Executed as one governed slice; titles from prompt register |
| RSVP not a boolean | `NOT_SUPPLIED` / `ATTENDING` / `NOT_ATTENDING` / `UNCERTAIN` |
| Guest access | Opaque invitation token + narrow guest session |
| No parallel guest truth | References operational guest and event ids only |
| Verified-field conflict | Preserve both values; open exception; no last-write-wins |
| Household authority | Explicit `HOUSEHOLD_RESPONDENT` entitlement only |
| Staff visibility | Directory column, filters, RSVP workspace, review queue |
| Communications | Invitation capability only; delivery deferred |
| RSVP ≠ admission | Documented and asserted; no check-in records |
| Formal technical acceptance | `MD-PR-S011` / `EVT-SEED-EOS-S03-ACCEPT` |
| Named reviewer, not Cursor / UNKNOWN | `ChatGPT / AI CTO` via `ACCEPTANCE_RECORDED` |
| Immutable implementation commit | `bed7cebeb14e731c1d0e8a289ceb7cfa21f546fe` / `EV-EOS-S03-COMMIT` |
| Final verified HEAD may differ | `e57fe1a275da0f01f2a8b237d1579f54c20f86d5` recorded separately |
| Predecessor law | EOS-S02 already ACCEPTED; default ACCEPTANCE dependency satisfied |
| Projector derives ACCEPTED | No handwritten status override as source truth |
| Accepted count exactly 3 | EOS-S01, EOS-S02 and EOS-S03 only |
| EOS-S04 eligibility | Default ACCEPTANCE on EOS-S03; READY after acceptance; implementation authorised under MD-PR-S015 |
| EOS-S04 implementation | Complete and IN_REVIEW; native coverage 62/62; not accepted |
| Foundation / gates / production | Foundation IN_REVIEW; protected gates unsigned; `productionAuthorised = false` |

## EOS-HV1

**Prompt Control ID:** `MD-PR-S013`
**Milestone:** `EOS-HV1`

| Requirement | Record |
|-------------|---------|
| CEO human walkthrough completed | `docs/control/EVENT_OS_S01_S03_HUMAN_VERIFICATION.md` |
| Deployment subject | `9cee3095-cb37-422a-be9e-ad632fa27a1b` / source `2d41a6fdb62f3192d7f27517e5eceb0b8ee96217` |
| Synthetic data only | Maison Doclar Verification Event; Amina Verification, David Example, Tola Fixture |
| Integrated journey | Staff, guest access, RSVP, amendment, handoff, RSVP ≠ admission all PASS |
| Mobile human verification | NOT ASSESSED |
| Overall ruling | PASS WITH MINOR REFINEMENTS |
| Findings | HV-EOS-001 … HV-EOS-005; not technical debt; not EOS-S04 scope by default |
| EOS-S03 acceptance identity | Unchanged: `bed7cebeb14e731c1d0e8a289ceb7cfa21f546fe` |
| Production / EOS-S04 | Unauthorised |

## EOS-S04-RECON

**Prompt Control ID:** `MD-PR-S014`
**Milestone:** `EOS-S04-RECON`

| Requirement | Record |
|-------------|---------|
| Native pack | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` |
| Native IDs | S4-01–S4-62 / MD-PR-0170–MD-PR-0231 |
| Coverage | 62/62 in `docs/control/EOS_S04_PROMPT_COVERAGE.md` |
| HV map | HV-EOS-001 NO; 002–004 PARTIAL; 005 POLICY-ONLY |
| Architecture | Extend shared-platform / Event OS; no parallel domain |
| Provider / production | Neutral adapters; no real guest contact; no Railway |
| EOS-S04 status | READY at reconciliation; implementation executed under MD-PR-S015 |

## EOS-S04 implementation

**Prompt Control ID:** `MD-PR-S015`
**Slice ID:** `EOS-S04`

| Requirement | Record |
|-------------|---------|
| Native coverage | S4-01–S4-62 / 62/62 |
| Implementation commit | `8d87dc13ce87ab1431783d0e6649b34807eeb7ab` / `EV-EOS-S04-COMMIT` |
| Formal technical acceptance | `EV-EOS-S04-ACCEPT` / `EVT-SEED-EOS-S04-ACCEPT` at `2026-09-06T04:10:00Z` by `ChatGPT / AI CTO` |
| Dispositions | A 42 / C 13 / G 4 / H 1 / F 2 |
| S4-61 | SATISFIED — independent technical review PASS; GATE-INDEPENDENT remains unsigned |
| S4-62 | SATISFIED FOR EOS-S04 TECHNICAL ACCEPTANCE / HANDOVER ONLY |
| Production / Railway / real send | NO |
| Status | ACCEPTED; accepted count 4 |

## EOS-S05

**Prompt Control ID:** `MD-PR-S028`–`MD-PR-S035`
**Slice ID:** `EOS-S05` (catalogue slice)

| Requirement | Record |
|-------------|---------|
| Title | Venue registry and spatial layout |
| Implementation lineage | `MD-PR-S028`–`MD-PR-S034` |
| Formal technical acceptance | `EV-EOS-S05-ACCEPT` / `MD-PR-S035` on `2026-09-08` by `ChatGPT / AI CTO` |
| Accepted implementation SHA | `eba137712c65c6f59b77fe2a88a8f4a277228cd9` |
| Historic units | `S5-01`–`S5-60` / `MD-PR-0232`–`MD-PR-0291` remain `NOT_EXECUTED` |
| Production / Railway / real operations | NO — documentation-only acceptance; Event OS not redeployed |
| Status | ACCEPTED; catalogue accepted-slice count 5 |
| Successor | EOS-S05A is the controlled non-catalogue insert; EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`; `MD-PR-S036` is not implementation authority |

## EOS-S05A

**Prompt Control ID:** `MD-PR-S053` (acceptance; implementation lineage `MD-PR-S037`–`MD-PR-S051`)
**Slice ID:** `EOS-S05A` (not a programme-catalogue accepted slice)

| Requirement | Record |
|-------------|---------|
| Title | Discovery, Investment & Executive Event Command |
| Authority | George Lawson ratification overlay `docs/control/EOS_S05A_RATIFICATION.md` |
| Canonical corpus | `docs/control/eos-s05a/` — documents 00, 01, 02, 02A, 03, 04A–04D, 05 and the consolidated v2.0 Word pack |
| Controlling implementation volume for this prompt | Whole-slice implementation already complete; this prompt is documentation-only acceptance |
| Later units | `EEC-11`–`EEC-44` implemented and accepted with the slice; `EEC-45` satisfied by `MD-PR-S053` |
| Implementation ledger | `docs/control/EOS_S05A_BUILD_LEDGER.md` |
| Implementation record | `docs/control/EOS_S05A_IMPLEMENTATION.md` |
| ADR | `docs/control/ADR_EOS_S05A_EXECUTIVE_EVENT_COMMAND.md` |
| Production / Railway / real operations | NO — documentation-only acceptance; Event OS and Control Tower not redeployed; `productionAuthorised` remains false |
| Status | ACCEPTED under `MD-PR-S053` at SHA `50322fa5fdf7b46437dc9d62579e2e2ad918e762`; not a catalogue slice; catalogue accepted-slice count remains 5 |
| Acceptance record | `docs/control/EOS_S05A_ACCEPTANCE.md` |
| Successor | EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`; `MD-PR-S036` is not consumed; EOS-S05B later implemented under `MD-PR-S054` |

## EOS-S05B

**Prompt Control ID:** `MD-PR-S069` (acceptance; implementation lineage `MD-PR-S054`–`MD-PR-S068`)
**Slice ID:** `EOS-S05B` (not a programme-catalogue accepted slice)

| Requirement | Implementation |
|-------------|----------------|
| Title | Risk, Protection & Continuity Command |
| Authority | George Lawson ratification; implementation under `MD-PR-S054` |
| Canonical corpus | `docs/control/eos-s05b/` — documents 00–13, 14A–14D, 15 and the Word ratification pack |
| Controlling implementation volume | Whole-slice `RPC-01`–`RPC-55` |
| Implementation ledger | `docs/control/EOS_S05B_BUILD_LEDGER.md` |
| Implementation record | `docs/control/EOS_S05B_IMPLEMENTATION.md` |
| Production / Railway / real operations | NO — Event OS deploy of synthetic implementation only; Control Tower not redeployed; `productionAuthorised` remains false |
| Status | ACCEPTED under `MD-PR-S069` at SHA `84d58dd4590fb7d2087b436d10c0b2ae992b1621`; not a catalogue slice; catalogue accepted-slice count remains 5 |
| Acceptance record | `docs/control/EOS_S05B_ACCEPTANCE.md` |
| Successor | EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`; `MD-PR-S036` is not consumed |

## EOS-S04A

**Prompt Control ID:** EOS-S04A-P00–P11
**Slice ID:** `EOS-S04A` (not a programme-catalogue accepted slice)

| Requirement | Implementation |
|-------------|----------------|
| Structured addressing, parties, RA, entitlements | `packages/shared-platform` S04A schemas/services; Event OS dossier workspaces |
| Academy delta ACA-S04A | `packages/academy`; Event OS `/app/academy/aca-s04a` |
| Assessment 80 / 90 / retake | `evaluateAcademyAttempt` |
| Course ≠ operational authority | `AUTHORITY_DISCLAIMER`; result flags all false |
| Operator handover | `docs/control/EOS_S04A_OPERATOR_HANDBOOK.md` |
| Human verification | `docs/control/EOS_S04A_HUMAN_VERIFICATION.md` |
| Status | IN_REVIEW / not ACCEPTED |
