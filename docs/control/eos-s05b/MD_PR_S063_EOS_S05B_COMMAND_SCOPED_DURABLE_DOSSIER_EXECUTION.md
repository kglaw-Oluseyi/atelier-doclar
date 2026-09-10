# MD-PR-S063 — EOS-S05B Command-Scoped Durable Dossier Execution

## 0. Authority and outcome

This is the controlling implementation authority after MD-PR-S062 stopped honestly. It replaces timeout/page-slimming workarounds with the command-scoped normalized persistence boundary required for production-realistic dossier, publication and client-access operations.

Execute continuously. Do not report READY FOR CLAUDE unless every live gate in §12 passes.

EOS-S05B remains **NOT ACCEPTED**. Claude must not be run. EOS-S06 must not be started.

## 1. Exact baseline and scope

- Repository: `kglaw-Oluseyi/atelier-doclar`
- Branch: `main`
- Required local/origin/GitHub/live SHA: `3dc982c0a8058526b7b6237878073e34e2b008ab`
- Railway: `atelier-doclar` / `production` / `event-os` only
- Current deployment: `080e3a34`
- Control Tower must not change or deploy.

Verify exact parity and non-overlapping worktree. Stop on discrepancy.

Read the current:

- `risk-repository.ts`
- `postgres-risk-store.ts`
- `memory-risk-store.ts`
- `service.ts` S05B methods
- dossier operations/projections/schemas
- client dossier grants/sessions
- protection form lifecycle/actions
- normalized migrations 004–006
- S060–S062 focused pages and tests.

## 2. Confirmed architectural blocker

`RiskTransaction` and normalized tables exist, but affected production commands still call generic `PlatformService.mutate(...)`. That path hydrates accumulated platform state, runs an in-memory mutation, and computes `writeRiskSnapshotDelta(previous, next)` across risk collections.

`runDurableProtectionMutation` only wraps and labels the result. It does not make the business command bounded.

The live result is authoritative evidence:

- full page was slimmed;
- `structuredClone` was removed;
- timeouts were increased;
- assemble still did not return a durable DRAFT inside six minutes.

Do not increase timeouts again. Do not add background false-success, queue-and-hope semantics, another page variant, or another whole-snapshot optimization.

## 3. Required target architecture

### 3.1 New explicit repository

Add a command-specific interface, adapting names to repository conventions:

```ts
export interface RiskDossierRepository {
  transaction<T>(work: (tx: RiskDossierTransaction) => Promise<T>): Promise<T>;

  getWorkspace(input: {
    organisationId: string;
    eventId: string;
    actorProjection: RiskProjectionAudience;
  }): Promise<RiskDossierWorkspace>;
}

export interface RiskDossierTransaction {
  loadEdition(id: string, scope: RiskScope, lock?: "FOR_UPDATE"): Promise<RiskDossierEdition | undefined>;
  loadCurrentWorking(scope: Required<RiskScope>, lock?: "FOR_UPDATE"): Promise<RiskDossierEdition | undefined>;
  loadCurrentPublication(scope: Required<RiskScope>, lock?: "FOR_UPDATE"): Promise<RiskDossierPublication | undefined>;
  loadPublicationEdition(scope: Required<RiskScope>): Promise<{ publication: RiskDossierPublication; edition: RiskDossierEdition } | undefined>;
  loadApplicabilitySnapshot(idOrHash: { eventId: string; id?: string; contentHash?: string }, scope: RiskScope): Promise<RiskApplicabilitySnapshot | undefined>;
  listEventEditions(scope: Required<RiskScope>, options?: { limit?: number; cursor?: string }): Promise<RiskDossierEdition[]>;
  listEventPublications(scope: Required<RiskScope>, options?: { limit?: number; cursor?: string }): Promise<RiskDossierPublication[]>;
  loadGrant(id: string, scope: RiskScope, lock?: "FOR_UPDATE"): Promise<RiskDossierAccessGrant | undefined>;
  findGrantByTokenHash(tokenHash: string): Promise<RiskDossierAccessGrant | undefined>;
  insertEdition(record: RiskDossierEdition): Promise<void>;
  updateEdition(id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void>;
  insertPublication(record: RiskDossierPublication): Promise<void>;
  updatePublication(id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void>;
  insertGrant(record: RiskDossierAccessGrant): Promise<void>;
  updateGrant(id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void>;
  insertClientMessage(record: RiskDossierClientMessage): Promise<void>;
  appendAudit(record: AuditEvent): Promise<void>;
  getIdempotency(scope: RiskScope, action: string, key: string): Promise<RiskIdempotencyRecord | undefined>;
  insertIdempotency(receipt: RiskIdempotencyRecord): Promise<RiskIdempotencyRecord>;
}
```

The Postgres implementation must use indexed, parameterized queries scoped to exact organisation/event/ID. It must not call `loadAll`, `loadOrganisationAsync`, hydrate a `PlatformSnapshot`, or call `writeRiskSnapshotDelta`.

The memory implementation must implement the same interface for deterministic tests.

### 3.2 Shared domain decisions, no duplicated rules

Extract or preserve pure decision functions for:

- assemble content/hash;
- DRAFT → SUBMITTED;
- exact-hash approval;
- publication eligibility and maker/checker;
- publication replay/supersession;
- grant issue/revoke/renew;
- client message eligibility.

Both legacy snapshot tests and the new repository command handlers must call the same pure validators/builders. Do not fork a “Postgres version” of business policy.

Example shape:

```ts
buildDossierEdition(input, exactDependencies): RiskDossierEdition
decideDossierTransition(current, command, actor, now): RiskDossierEdition
decideDossierPublication(edition, priorPublication, command, actor, now):
  | { application: "APPLIED"; publication; editionPatch; priorPatch? }
  | { application: "REPLAYED"; publication }
```

## 4. Command-scoped service

Add a dedicated service, for example `RiskDossierCommandService`, injected with:

- `RiskDossierRepository`;
- canonical permission evaluator;
- clock;
- UUID/token/hash providers;
- audit builder;
- token pepper configuration.

It must implement:

```ts
assemble(actor, command)
submit(actor, command)
approve(actor, command)
publish(actor, command)
export(actor, command)
issueClientAccess(actor, command)
renewClientAccess(actor, command)
revokeClientAccess(actor, command)
resolveClientSession(token)
recordClientMessage(clientActor, command)
getStaffWorkspace(actor, organisationId, eventId)
getClientProjection(clientActor, eventId)
```

### 4.1 Authorization

Authorize from the authenticated actor’s canonical active assignments and exact permission key before opening a write transaction. Re-check scope-bound facts needed for the command inside the transaction.

Do not call generic `PlatformService.mutate` for these methods.

### 4.2 Standard transaction envelope

For every write:

1. validate command schema;
2. validate actor permission/scope;
3. begin database transaction;
4. check idempotency key/payload hash;
5. load only exact required aggregates with `FOR UPDATE` where concurrent currentness matters;
6. call shared pure decision logic;
7. execute explicit INSERT/optimistic UPDATE statements;
8. insert audit;
9. insert both canonical `platform_idempotency` and `risk_idempotency_receipts` as required by current architecture;
10. commit;
11. reload the exact result through a bounded query;
12. return `APPLIED` or `REPLAYED`;
13. only then let Event OS write its result and redirect.

Any exception rolls back all rows. Never report success before commit.

### 4.3 Concurrency

Use:

- optimistic `WHERE id = ? AND version = ?`;
- partial unique index for one current working dossier per event;
- partial unique index for one CURRENT publication per event;
- row lock on the prior current publication during successor publish;
- deterministic publication number allocation inside the transaction.

Map zero-row optimistic updates and unique-current races to `VERSION_CONFLICT`, not 503.

## 5. Bounded read projections

The focused dossier page and client dossier route must use command-scoped reads.

### Staff workspace query

Return only:

- event identity and human label;
- latest applicability readiness summary and captured hash;
- current working edition;
- current publication plus referenced edition;
- bounded recent edition/publication history;
- active/recent client grants;
- current actor capabilities.

Do not load policies, all rules, all incidents, all organisation history or the whole platform snapshot.

### Client query

Resolve:

1. token hash/session grant;
2. ACTIVE/not-expired/not-revoked grant;
3. exact organisation/event;
4. current publication;
5. referenced edition with matching hash;
6. permission-safe client projection.

Do not load staff workspace history.

### Performance acceptance

Against the retained live Alpha corpus:

- staff dossier GET p95 target under 3 seconds for the focused verification run;
- assemble/submit/approve/publish mutation each completes under 10 seconds normally;
- no individual action may rely on a Playwright timeout above 30 seconds;
- record actual server/action timings.

Railway cold start may be reported separately with evidence, but must not be used to excuse steady-state multi-minute commands.

## 6. Explicit SQL/repository tests

Use the normalized Postgres adapter or a transaction-faithful test database. Prove:

1. assemble queries only bounded dependencies and inserts one DRAFT;
2. no call to `loadAll`, snapshot hydrate or `writeRiskSnapshotDelta`;
3. submit updates one edition by expected version;
4. Director approval exact hash;
5. CEO publish inserts one publication and supersedes prior current atomically;
6. identical publish returns same publication with `REPLAYED`;
7. concurrent publishes yield one APPLIED and one REPLAYED/VERSION_CONFLICT, never two CURRENT;
8. failed audit/idempotency insert rolls back edition/publication;
9. new DRAFT leaves last-known-good client publication unchanged;
10. grant issue stores hash only;
11. revoke immediately blocks token/session;
12. cross-org/event queries return no record;
13. Auditor/Admin mutations denied before write;
14. result reload is bounded and matches committed identity/hash/version.

Add query-spy assertions or repository fakes that fail if a command calls broad-loading methods.

## 7. Govern the three additional S061 fixture authorities

S062 discovered these current-approved timestamp rules:

- `s061-public-liability-1789066731022` / `00587236-fa20-4180-95c0-c0649eb728eb`
- `s061-public-liability-1789066767651` / `cfc0b05a-8a74-4c74-a73a-71c03a99e2ab`
- `s061-public-liability-1789067404599` / `6b9330b0-9563-4180-bf3a-bf2dcfb8b1f7`

Before classification, resolve exact live IDs, versions, hashes, authors and lineage.

If and only if durable test evidence proves these are S061 automated QA authorities:

1. create explicit fixture classification receipts bound to exact IDs/hashes;
2. preview exactly those three;
3. Risk Governance Reviewer withdraws them atomically as obsolete synthetic QA authority;
4. retain immutable history;
5. do not touch `s061-public-liability-1789066558518` / `64d4a54b-c833-4826-8756-76699ec794c2`;
6. do not touch S059 history-only draft;
7. prove no other rule/source changed.

If any cannot be proven synthetic from durable evidence, stop and report that exact record. Do not infer solely from its name.

## 8. Applicability and dossier precondition

After governed withdrawal:

1. run Alpha applicability once;
2. record effective rule/source IDs/hashes;
3. confirm obsolete S060/S061 QA authorities are history only;
4. confirm the designated S061 authority remains governing;
5. inspect remaining GAPS/STALE/INDETERMINATE reasons.

Dossier assembly may truthfully include gaps and residual risks. It must not require READY merely to create a DRAFT. Publication must follow the ratified gate and cannot be forced.

If a genuinely governing authority remains stale, stop before publish and report it. Do not renew or withdraw genuine authority without separate evidence.

## 9. Current evaluation corpus

Current corpus:

- `s05b-eval-v6`
- 63 cases
- hash `987f4b6d1c4747074d750eb96a37df48e223627fd069003f75462c0769f15e04`
- live status currently STALE with 56/63 persisted.

Repository persistence refactoring should not change domain outcomes. Keep v6 if case definitions/contracts remain byte-identical. Add repository-boundary tests outside the domain corpus.

If domain contract/cases change, advance honestly and stale v6. Never restamp.

Run the current corpus once live as CEO only after authority recovery and application deployment. Require complete persisted results, zero failures, zero-tolerance clear and releaseReady true.

## 10. Browser suites

Create:

- `s05b-s063-dossier-performance.spec.ts`
- `s05b-s063-publication-client.spec.ts`
- `s05b-s063-repository-concurrency.spec.ts`

### Live chain

1. warm focused dossier GET and record duration;
2. Planner assembles uniquely labelled DRAFT;
3. Planner submits;
4. Planner self-approve denied;
5. Director approves exact hash;
6. Director publish denied;
7. CEO publishes exact hash;
8. identical publish replays;
9. create successor DRAFT and prove last-known-good client publication remains;
10. CEO issues client grant without sending;
11. establish genuinely separate client context;
12. view current publication;
13. submit synthetic question/acknowledgement;
14. revoke grant;
15. existing client context denied;
16. refresh and prove durable state.

Use independent role contexts. No shared-cookie evidence.

### Failure criteria

Any of these is a product failure:

- action exceeds 30 seconds steady state;
- request times out/503s;
- page needs full platform hydration;
- success shown before durable row exists;
- prior publication disappears;
- client session inherits staff authority.

Do not increase timeout to manufacture a pass.

## 11. Full gates

Run in order:

1. focused repository/transaction tests;
2. S060 dossier/client tests through the new service;
3. S061/S062 authority tests;
4. evaluation/readiness/mutation-sensitivity;
5. typecheck;
6. full shared-platform tests;
7. full Event OS tests;
8. programme validation;
9. Event OS build;
10. `git diff --check`;
11. focused local Playwright;
12. MD-PR-S058 validation regression.

Record every first-run failure and correction.

Commit/push normally, prove parity and deploy Event OS only. Verify exact SHA, alive/ready, POSTGRES, migrations APPLIED, production false, providers inactive and S05A PASSED.

Then perform:

1. exact governed withdrawal in §7 if authorised by evidence;
2. Alpha re-evaluation;
3. current CEO corpus;
4. complete live chain in §10;
5. focused live concurrency/performance smoke.

## 12. Non-negotiable live exit gate

READY FOR CLAUDE may be `yes` only when all pass live:

- dossier GET and mutations complete within stated bounds;
- no snapshot-wide mutation/load/diff is used by affected commands;
- exact synthetic authority recovery completed without unrelated change;
- current corpus PASSED completely;
- Planner assemble/submit;
- Director approve;
- CEO publish and replay;
- last-known-good survives successor draft;
- separate client session views publication;
- client grant revocation blocks access;
- no 503, timeout, false success or external side effect.

Otherwise report `READY FOR CLAUDE: no` and stop.

## 13. Prohibitions

- No further timeout inflation.
- No background “accepted” mutation without durable completion.
- No raw SQL/manual live edits outside migration/repository code and governed UI actions.
- No broad cleanup or deletion.
- No real data.
- No provider, communication, payment, booking, claim, dispatch or biometric action.
- No secrets in reports/logs/screenshots.
- Keep `productionAuthorised:false`.
- Do not run Claude.
- Do not accept EOS-S05B.
- Do not start EOS-S06.
- Do not deploy Control Tower.

## 14. Final report

Return:

- baseline/final/application/docs SHAs;
- files/commits;
- proof of the old broad mutation path and its replacement;
- repository interfaces and exact SQL query scope;
- business-validator reuse;
- transaction/idempotency/audit ordering;
- concurrency and rollback evidence;
- performance timings local/live;
- three S061 record provenance and governed disposition;
- Alpha applicability after recovery;
- evaluation edition/hash/run/counts;
- full live dossier/publication/client chain;
- focused/full gates and all first-run failures;
- GitHub/Railway parity;
- rollback/forward recovery;
- explicit READY FOR CLAUDE yes/no;
- confirmations: Claude not run, EOS-S05B not accepted, EOS-S06 not started, Control Tower not deployed, production unauthorised.

Stop for AI CTO review.

`EOS-S05B MD-PR-S063 COMMAND-SCOPED DURABLE DOSSIER EXECUTION AUTHORISED — REMOVE WHOLE-SNAPSHOT COMMAND DEPENDENCY, COMPLETE LIVE GATES, REPORT AND STOP — NOT ACCEPTED — EOS-S06 NOT STARTED.`
