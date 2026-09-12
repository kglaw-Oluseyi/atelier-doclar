# MD-PR-S073 — EOS-S06 V2 Live Command Settlement and Process Isolation

**Status:** DRAFT FOR CEO RATIFICATION — NOT IMPLEMENTATION AUTHORITY UNTIL RATIFIED  
**Programme:** Maison Doclar Event Operating System  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Railway scope:** project `atelier-doclar` / environment `production` / service `event-os` only  
**Known live Event OS application SHA before this authority:** `66e5bc18dad3632fbca4b21da2bdf56afa084cd1`  
**Expected repository baseline:** the full commit resolved by `3edd535` (reported as locator-only after the application SHA). Cursor must resolve and record the full SHA before doing anything.  
**Parent authority:** ratified MD-PR-S072, SHA-256 `de154b2349f2056275d66dcc11d3ab88f3b283b16d0acd37311ea8ca628f3182`  
**Current disposition:** EOS-S06 NOT ACCEPTED · NOT READY FOR CLAUDE · EOS-S07 NOT STARTED

---

## 0. Authority, purpose and execution mode

This is the sole authority for diagnosing and correcting the remaining EOS-S06 V2 live command-settlement failure discovered during MD-PR-S072 Phase 13. It does not reopen the accepted upstream guest, RSVP, layout, Event Brief, Budget, Protection Command or shared authority models except where a measured S073 branch proves that a shared action-result defect must be corrected.

This authority is deliberately split into eight sequential execution packets. Cursor must execute them in order. Cursor may proceed automatically from one packet to the next only after that packet's exit gate is satisfied and recorded. Cursor must not combine packets, implement a likely solution before diagnosis, or defer a failed exit gate to the final report.

### 0.1 Ratification wording

The CEO may ratify using exactly:

> I RATIFY MD-PR-S073 AS THE SOLE AUTHORITY TO DIAGNOSE AND CORRECT THE EOS-S06 V2 LIVE COMMAND-SETTLEMENT AND PROCESS-ISOLATION FAILURE. CURSOR SHALL EXECUTE PACKETS 1–8 IN ORDER, MAY CONTINUE AUTOMATICALLY ONLY AFTER EACH EXIT GATE PASSES, AND SHALL STOP AT EVERY STATED HARD STOP. THIS DOES NOT ACCEPT EOS-S06, AUTHORISE REAL DATA OR PRODUCTION OPERATIONS, RUN CLAUDE, DEPLOY CONTROL TOWER, OR START EOS-S07.

### 0.2 Non-negotiable scope

1. Preserve the S072 V2 seating truth architecture.
2. Preserve the repaired recall content identity.
3. Preserve `UNSEATED_REQUIRED_GUEST` and the rule that unseated required subjects cannot satisfy HARD relations.
4. Preserve governed reservation activation, withdrawal, successor history and package selection.
5. Preserve the independent validator as authority over solver claims.
6. Preserve immutable input packages, runs, editions, publications and audit history.
7. Preserve last-known-good publication while a successor is WORKING/DRAFT/SUBMITTED.
8. Preserve Event OS `productionAuthorised:false` and all inactive external providers.
9. Use synthetic fixtures only.
10. Deploy Event OS only when application code changes.
11. Do not deploy Control Tower.
12. Do not run Claude, access a sealed holdout, accept EOS-S06 or start EOS-S07.

### 0.3 The proven problem

On live application SHA `66e5bc18dad3632fbca4b21da2bdf56afa084cd1`:

- a first seating mutation on a fresh page normally settled in approximately 0.9–1.9 seconds;
- after a later freeze/launch against accumulated Alpha One authority, subsequent valid commands emitted a browser POST, but no new `?result=<UUID>` appeared within 30 seconds;
- affected later commands included rule activation, withdrawal, reservation creation, freeze/launch and assign-unseated;
- tests did not increase timeouts, accept an old banner or swallow failures;
- the exact last completed server stage was not yet proven;
- the remaining live gates and MD-PR-S072 Phase 14 were therefore stopped.

The failure may be one or more of:

| Branch | Candidate |
|---|---|
| A | CPU-bound solver starves the Next.js event loop or survives a nominal timeout |
| B | a database transaction remains open across non-database work |
| C | a lock or connection-pool wait blocks later commands |
| D | a 303 with a fresh result is emitted but the result cannot be retrieved/rendered |
| E | an error/redirect is caught and converted to a 200 render without a result |
| F | an abandoned `RUNNING` row or lease obstructs later commands |

No branch is assumed proven. Packet 2 must prove the branch before Packet 4 may alter runtime architecture.

---

# PACKET 1 — Baseline, repository truth map and regression lock

## 1.1 Objective

Map the actual repository implementation and establish a safe baseline. No corrective implementation is permitted in this packet.

## 1.2 Placement and baseline

1. Find this file in the repository root.
2. Compute its SHA-256 before moving it.
3. Move it byte-for-byte to:

   `docs/control/eos-s06/MD_PR_S073_EOS_S06_V2_LIVE_COMMAND_SETTLEMENT_AND_PROCESS_ISOLATION.md`

4. Recompute SHA-256 and require an exact match.
5. Resolve `git rev-parse 3edd535` to a full SHA.
6. Before the authority placement commit require:
   - local HEAD = `origin/main` = GitHub `main` = resolved full SHA;
   - worktree clean other than this authority file if it arrived untracked;
   - live Event OS `/api/health/live` deployed SHA = `66e5bc18dad3632fbca4b21da2bdf56afa084cd1`;
   - `/api/health/ready`: ready, POSTGRES, migrations APPLIED, `productionAuthorised:false`;
   - S05A and S05B readiness unchanged and passing;
   - external providers inactive.
7. If `3edd535` is absent/ambiguous, parity differs, unrelated changes exist, live SHA differs, a migration is not APPLIED, or production is authorised: stop and report. Do not infer or repair baseline.
8. Commit only the unchanged authority placement.

## 1.3 Mandatory repository truth map

Use `rg`/repository inspection. Record exact files, exported symbols and call sequence for:

1. seating form component and hidden command/idempotency fields;
2. Next.js server actions for rule, reservation, freeze, launch, withdraw, recall and manual changes;
3. action wrapper and public error mapping;
4. `redirect()` call and every surrounding `try`, `catch`, `finally` or durable wrapper;
5. action-result write, storage, retrieval, recall and consume logic;
6. seating V2 command service and repository interfaces;
7. PostgreSQL client/pool and transaction helper actually in use;
8. event/current-row locks and all `FOR UPDATE` queries;
9. freeze: upstream reads, canonicalisation, hashing and package insert/replay;
10. launch: run insert, solver call, validator call and terminal persistence;
11. solver timeout, abort or node-budget implementation;
12. run statuses, leases and recovery logic;
13. independent validator imports and execution placement;
14. Next.js runtime/build configuration and standalone output;
15. Railway start command and replica/process topology visible without changing it;
16. current S06 evaluation edition, contract, hash and readiness computation;
17. remaining-gates Playwright helper and its exact fresh-result logic.

Create:

`docs/control/eos-s06/MD_PR_S073_REPOSITORY_TRUTH_MAP.md`

The map must state facts with file/symbol evidence. It must not use “probably”, invent Prisma, or describe a proposed implementation as current.

## 1.4 Preserve regression facts before correction

Add or retain focused tests proving:

- unchanged recall successor retains the recalled material content hash;
- unseated required guest is a hard structural violation;
- HARD relation with an unseated required subject is not `SATISFIED`;
- only ACTIVE reservations enter a new package;
- Adopt is unavailable without a current independent `FEASIBLE` report;
- legacy/previous published plan remains available during successor work.

Do not edit production behaviour merely to make these tests easier.

## 1.5 Packet 1 exit gate

Exit only when:

- placement hash matches;
- baseline/parity/live checks pass;
- the truth map identifies every responsibility above;
- the existing repaired invariants pass focused tests;
- no corrective runtime code has been changed.

Commit truth-map/tests separately. Then continue automatically to Packet 2.

---

# PACKET 2 — Temporary discriminating instrumentation and one live reproduction

## 2.1 Objective

Instrument one command across browser, server action, PostgreSQL transaction, solver, action result, redirect and render so the failure branch is established rather than guessed.

This packet may change diagnostic code and tests only. It must not introduce a worker, new run architecture, new action-result store or timeout increase.

## 2.2 Correlation contract

Use these concepts, adapting only names already canonical in the repository:

```ts
export type SeatingSettlementStage =
  | "HTTP_RECEIVED"
  | "ACTION_ENTER"
  | "TX_BEGIN"
  | "RUN_QUEUED"
  | "ACTION_RESULT_WRITTEN"
  | "TX_COMMIT"
  | "TX_ROLLBACK"
  | "SOLVER_START"
  | "SOLVER_TERMINAL"
  | "REDIRECT_EMITTED"
  | "HTTP_RESPONSE"
  | "RENDER_RESULT_FOUND"
  | "RENDER_RESULT_MISSING";

export interface SeatingSettlementTrace {
  stage: SeatingSettlementStage;
  commandId: string;
  requestId?: string;
  runId?: string;
  resultId?: string;
  commandType?: string;
  eventId?: string;
  attempt?: number;
  wallMs: number;
  monoNs?: string;
  durationMs?: number;
  outcome?: "APPLIED" | "REPLAYED" | "NOT_APPLIED";
  reasonClass?: string;
  transactionLabel?: string;
  workerExitCode?: number;
}
```

Rules:

- Use the command's existing durable idempotency identifier as `commandId` if it is already a UUID and uniquely identifies the invocation. Do not create a second competing idempotency system.
- Otherwise introduce one UUID at form render and define precisely when it is retained for retry or replaced for a new command.
- `requestId` identifies one HTTP exchange, not a durable command.
- Never log guest names, rule free text, reasons, form bodies, cookies, tokens, policy data or headers. Identifiers, hashes, enum values, counts and durations only.
- Structured stage records go to existing structured logs. Do not add a diagnostic database table.
- Durable row inspection separately proves queue/result/terminal writes.

## 2.3 Stage locations

Emit:

1. `HTTP_RECEIVED` when the Node request enters the relevant mutation path. Do not force middleware onto Edge merely for this trace.
2. `ACTION_ENTER` as the first line after safe extraction of the command identifier.
3. `TX_BEGIN` from the actual transaction helper.
4. `RUN_QUEUED` after insert, but report it as durable only after `TX_COMMIT` and row reload.
5. `ACTION_RESULT_WRITTEN` after write, but report it as durable only after commit and reload.
6. `TX_COMMIT` or `TX_ROLLBACK` with elapsed time.
7. `SOLVER_START` immediately before current solver execution.
8. `SOLVER_TERMINAL` only when computation has actually ended, not when the caller stopped awaiting it.
9. `REDIRECT_EMITTED` immediately before top-level `redirect()`.
10. Playwright records actual response status, response-header time, `Location`/Next action redirect evidence and the fresh result UUID.
11. `RENDER_RESULT_FOUND` or `RENDER_RESULT_MISSING` when the result-bound page is rendered.

## 2.4 Protected event-loop diagnostic

Add a temporary Node-runtime route such as `/api/_diag/event-loop` only if no existing protected diagnostic mechanism can provide the evidence.

It must require all of:

- `productionAuthorised === false`;
- fixtures enabled;
- a temporary `EVENT_OS_DIAGNOSTIC_TOKEN` compared using constant-time comparison;
- token unset means route unavailable;
- missing/invalid gate returns 404;
- rate limit of no more than one sample per 250 ms per token;
- no PID, hostname, environment values, paths, memory contents, secrets or raw instance identity;
- response limited to event-loop delay, timer drift, utilization and a one-way hashed instance discriminator.

Use:

- `perf_hooks.monitorEventLoopDelay()`;
- monotonic interval drift;
- `performance.eventLoopUtilization()`;
- external round-trip time from a separate Playwright request context.

Example public-safe shape:

```ts
interface EventLoopDiagnostic {
  ok: true;
  instance: string;
  sampleAgeMs: number;
  lagP50Ms: number;
  lagP99Ms: number;
  lagMaxMs: number;
  driftMs: number;
  utilization: number;
}
```

Delete/disable this route and remove the temporary token when diagnosis is complete. A permanent public diagnostic endpoint is prohibited.

## 2.5 Database observation

During the live reproduction, use a separate authorised database observation connection without mutation. Capture at two-second intervals:

- active transaction age;
- `idle in transaction` age;
- `wait_event_type` / `wait_event`;
- lock waits;
- connection acquisition wait measured in application code;
- pool active/idle/waiting counts if the actual driver exposes them.

Do not log SQL parameters or protected values. Do not manipulate PostgreSQL manually.

## 2.6 Playwright response evidence

The diagnostic test must:

- begin on a fresh synthetic, fully provisioned V2 event—not accumulated Alpha One—unless reproducing on Alpha One is explicitly necessary and read-only-safe;
- record the old result UUID;
- perform one real form click/request submission;
- prove exactly one mutation POST for that form;
- use response evidence, not request evidence alone;
- record response status and redirect location/result UUID;
- require the new UUID differs from the old UUID;
- require banner correlation equals the URL correlation;
- never let an old banner, empty alert, stale cookie or appeared-after-reload alone satisfy the action;
- poll the protected event-loop route in a separate request context during solver execution;
- collect stage logs by `commandId`.

Run one healthy first mutation, one expensive/impossible launch and one unrelated valid mutation during or immediately after it.

## 2.7 Diagnostic thresholds

Classification guidance:

| Signal | Diagnostic concern |
|---|---|
| probe unavailable or >2s continuously for ≥5s, recovered sample shows corresponding lag and utilization ≥0.9 | Branch A likely |
| command transaction >2s or idle-in-transaction >500ms | Branch B |
| lock or pool wait >1s | Branch C |
| 303 with fresh result UUID but render reports missing/mismatch | Branch D |
| 200/RSC response, no top-level redirect, caught error evidence | Branch E |
| expired/non-terminal run or lease gates later commands | Branch F |

These classify the defect. They are not the final product acceptance targets.

## 2.8 Diagnostic deployment

Run all local diagnostic tests and build. Commit and push the diagnostic SHA. Deploy Event OS only. Set the temporary diagnostic token without printing it. Run exactly the required reproduction and capture evidence. Do not run the full evaluation corpus merely to diagnose.

## 2.9 Packet 2 exit gate and hard stop

Create:

`docs/control/eos-s06/MD_PR_S073_DIAGNOSTIC_FINDING.md`

It must provide, per command:

- complete ordered stage timeline;
- browser request and response evidence;
- durable rows present/absent;
- event-loop evidence;
- database transaction/lock/pool evidence;
- exact last completed stage;
- branch classification A–F;
- evidence for every coexisting branch;
- rejected branches and why.

**HARD STOP:** If evidence does not distinguish the branch, contradicts the six authorised branches, exposes a migration-integrity issue, or would require a new service/secret/security model, stop for AI CTO review. Do not implement a speculative fix.

If at least one branch is conclusively established and its permitted correction below applies, commit the diagnostic finding and continue automatically to Packet 3.

---

# PACKET 3 — Correction decision record and tests-first contract

## 3.1 Objective

Convert the measured diagnostic into one explicit correction plan before production code changes.

## 3.2 Required decision record

Create:

`docs/control/eos-s06/ADR_EOS_S06_V2_COMMAND_EXECUTION_ISOLATION.md`

Record:

- observed branches;
- exact current last stage;
- chosen correction(s);
- rejected correction(s);
- transaction boundaries;
- process/thread topology;
- cancellation guarantee;
- run, lease and retry semantics;
- action-result scope if affected;
- migration requirement;
- build/deployment packaging;
- rollback/forward recovery;
- regression scope.

## 3.3 Permitted correction matrix

| Proven branch | Required correction |
|---|---|
| A | durable queue plus isolated executor; web action must not execute solver CPU inline |
| B | split transaction around compute; no non-database work inside transaction |
| C | correct holder/release/pool lifecycle; bound waits; narrow locks |
| D | correct the existing shared action-result persistence/binding/render path; no seating-only result system |
| E | move redirect after durable commit and outside catch; rethrow Next redirect sentinel |
| F | durable claim/lease/heartbeat/cancel/reaper; remove indefinite non-terminal obstruction |

Branches may coexist and all proven branches must be corrected.

## 3.4 Maximum two executor options

If Branch A is proven, choose exactly one:

1. **Preferred:** one `worker_threads` executor per Event OS process, concurrency 1, backed by durable PostgreSQL queue/lease authority.
2. **Fallback only if measured/build evidence rejects threads:** a sibling long-running Node worker process within the same Railway Event OS service, using the same durable queue.

A new Railway service, Python, external solver, external queue or external provider is not authorised.

Inline execution may exist only as a test adapter. Deployed composition must make it unreachable. There shall be no production environment switch that reactivates inline solving.

## 3.5 Tests first

Before runtime correction, write failing tests for every selected branch, including as applicable:

- main event loop remains responsive during busy solver execution;
- genuine termination at time/node budget;
- no transaction held during solving;
- one durable queued run and one audit/idempotency truth;
- duplicate claim impossible;
- lease expiry recovery;
- same command replay does not spawn;
- new command after timeout creates a linked retry;
- redirect is after commit;
- exact result binding survives replica/process boundary;
- no stale banner satisfies new action.

Record the failures. Do not weaken assertions after implementation.

## 3.6 Packet 3 exit gate

Exit only when ADR maps exactly to measured evidence, at most one executor option is selected, migration needs are known and focused tests fail for the intended pre-fix reason. Commit ADR/tests separately. Continue automatically to Packet 4.

---

# PACKET 4 — Branch-specific runtime correction

## 4.1 Shared TypeScript contracts

Use or adapt the following within the existing seating V2 modules. Do not introduce parallel domain truth.

```ts
export type SolverRunExecutionStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "TIMED_OUT"
  | "CANCELLED"
  | "ERROR";

export type SeatingValidationVerdict = "FEASIBLE" | "INFEASIBLE";
export type SeatingValidationMethod =
  | "FULL_VALIDATION"
  | "PREFLIGHT_CERTIFICATE";

export type SolverClaim = "FEASIBLE" | "INFEASIBLE" | "UNKNOWN";

export interface SolverExecutionRequest {
  runId: string;
  packageId: string;
  packageHash: string;
  compiledRequestJson: string;
  compiledRequestHash: string;
  solverVersion: string;
  configurationHash: string;
  seed: string;
  budgetMs: number;
  nodeBudget: number;
}

export interface SolverExecutionResult {
  runId: string;
  packageHash: string;
  compiledRequestHash: string;
  solverClaim: SolverClaim;
  assignmentsJson?: string;
  assignmentsHash?: string;
  certificate?: InfeasibilityCertificate;
  nodesExplored: number;
  durationMs: number;
}

export interface SolverExecutor {
  execute(
    request: SolverExecutionRequest,
    signal: AbortSignal,
  ): Promise<SolverExecutionResult>;
}

export interface SolverRunLease {
  runId: string;
  ownerId: string;
  attempt: number;
  expiresAt: string;
}

export interface SolverDispatcher {
  start(): Promise<void>;
  drain(): Promise<void>;
  claimNext(): Promise<SolverRunLease | null>;
  cancel(runId: string, actor: GovernedActor): Promise<CommandEffect>;
}

export type InfeasibilityCertificate =
  | { type: "CAPACITY"; requiredSubjectIds: string[]; usableCapacity: number }
  | { type: "APART_CLIQUE"; subjectIds: string[]; eligibleTableIds: string[]; ruleEditionIds: string[] }
  | { type: "CONTRADICTORY_PAIR"; subjectIds: string[]; ruleEditionIds: string[] }
  | { type: "NO_VALID_TABLE"; subjectId: string; ruleEditionIds: string[] }
  | { type: "RESERVATION_MINIMA"; tableId: string; reservedMinimum: number; capacity: number; reservationEditionIds: string[] };

export interface IndependentValidationReport {
  validatorVersion: string;
  packageId: string;
  packageHash: string;
  assignmentsHash?: string;
  verdict: SeatingValidationVerdict;
  method: SeatingValidationMethod;
  structuralOutcomes: readonly StructuralOutcome[];
  ruleOutcomes: readonly RuleOutcome[];
  certificateHash?: string;
  contentHash: string;
}
```

Use existing branded ID types and schemas where present. Do not copy raw string IDs into a second type system.

## 4.2 Run and validation invariants

Enforce in schema/domain and, where supported additively, database CHECK constraints:

- `COMPLETED` iff an independent validation report exists;
- `COMPLETED + FEASIBLE` requires assignments and assignments hash;
- `PREFLIGHT_CERTIFICATE` requires `INFEASIBLE`, no adopted assignments and a verified certificate;
- solver claim is evidence, never authority;
- Adopt requires `COMPLETED`, independent `FEASIBLE`, exact current package/run/report hashes and no stale governing input;
- `TIMED_OUT`, `CANCELLED` and `ERROR` are never adoptable;
- terminal runs are immutable;
- solving occurs outside every database transaction;
- independent validation occurs outside every database transaction;
- terminal persistence uses a short transaction after validation.

## 4.3 Durable run lifecycle and transaction boundaries

Implement against the actual repository/driver, not ORM fiction.

### Transaction 1 — launch acknowledgement

Pre-transaction bounded reads may construct the compiled request. Then:

```text
BEGIN
  lock current event seating pointer/version only
  reload and verify authority, event scope and expected version
  verify the active rule/reservation/upstream hash set still equals the pre-read set
  insert/reuse immutable input package by exact semantic identity
  insert idempotency receipt or load existing receipt
  if identical command receipt exists:
      write truthful REPLAYED action result referencing original run/current status
      do not create run; do not write second success audit
  else if reusable COMPLETED run exists for exact semantic identity:
      bind receipt to it; report REPLAYED; no solver execution
  else if QUEUED/RUNNING run already exists for exact semantic identity:
      bind/return NOT_APPLIED RUN_IN_PROGRESS; no duplicate run
  else:
      insert run QUEUED
      bind receipt
      append audit
      write action result APPLIED with status QUEUED
  update current pointer/version only where domain requires it
COMMIT
redirect with new result id outside the transaction and outside catch
```

The acknowledgement says queued, not solved.

### Claim transaction

Use one short `FOR UPDATE SKIP LOCKED` claim. Commit immediately after setting:

- `RUNNING`;
- opaque owner ID;
- lease expiry;
- started time;
- attempt.

Do not hold event, package, rule, reservation or plan locks during solve.

### Solve and validate

- Load immutable compiled request by package ID/hash.
- Execute outside a transaction.
- On solver output, reload the package independently for validation.
- The validator imports no solver module and trusts no solver verdict.
- Verify assignments or certificate outside a transaction.

### Terminal transaction

Lock the run only. Require current `RUNNING`, same owner, same attempt, same package hash and unexpired/lawfully extended lease. Insert validation report if completed; persist terminal state and audit; clear lease. Commit promptly.

Discard and audit a late result from an executor that lost ownership. It must not overwrite the canonical run.

## 4.4 Worker executor, only if Branch A is proven

Production composition creates the isolated executor unconditionally. Inline executor remains in test-only files/barrels.

Requirements:

- worker imports solver-domain code only; never imports React, Next.js, database, service composition or production secrets;
- plain canonical JSON input/output only; no functions, class instances, Maps or unsafe `BigInt` transfer;
- request and response hashes verified by dispatcher;
- concurrency 1 per Event OS process;
- memory `resourceLimits` bounded to a measured safe fraction of container memory;
- cooperative cancel flag checked at a fixed node interval;
- hard timeout calls and awaits `worker.terminate()`;
- node budget is an independent bound;
- `error`, `message` and `exit` handled exactly once;
- exit without valid message becomes `TIMED_OUT`, `CANCELLED` or `ERROR` according to recorded cause;
- listeners removed and references cleared after exit;
- no computation survives terminal recording.

Build requirements:

- dedicated worker TypeScript entry/config if needed;
- exact compiled worker included in Next standalone/Railway output;
- start-time existence/integrity check before dispatcher claims work;
- production-composition test proves inline executor is unreachable;
- no `SOLVER_EXECUTION=inline` production switch.

If worker threads cannot meet measured responsiveness/build/memory requirements, stop before switching to the sibling-process option and record the evidence. The ADR may then select the already-authorised sibling Node worker inside the same service. Do not invent a third option.

## 4.5 Dispatcher and lease lifecycle

Database state is authority. A process singleton is only a convenience.

Required behaviour:

- claim `QUEUED` rows with `FOR UPDATE SKIP LOCKED`;
- one owner per run/attempt;
- periodic heartbeat at a fraction of lease length;
- zero-row heartbeat means ownership lost; terminate/discard;
- cancel command marks queued runs terminal immediately or requests cancellation of running runs;
- owner observes cancellation and terminates after a short cooperative grace;
- expired lease requeues at most the configured attempt cap;
- exceeding cap records `ERROR/LEASE_EXPIRED`;
- old unclaimed queue entries record `ERROR/QUEUE_EXPIRED`;
- every requeue/failure/cancel has audit evidence;
- SIGTERM stops claims, returns/terminates owned work truthfully and releases resources within Railway grace;
- multiple replicas cannot double-execute;
- abandoned synthetic runs do not obstruct unrelated commands.

Starting from Next `instrumentation.ts` is allowed only if Packet 1 proves it executes once per Node server process in this build and the durable claim remains authority. Otherwise use the repository's existing custom server/composition mechanism. Do not rely on hot-reload behaviour as production proof.

## 4.6 Cancellation proof

Timeout must mean computation ended:

- termination/exit observed and awaited;
- shared node counter unchanged 500 ms after exit;
- no worker reference/listener retained;
- no transaction or lease remains;
- event-loop and command latency recover;
- process CPU returns close to the measured pre-run baseline, not an unrealistic absolute percentage;
- a subsequent run/command is responsive;
- durable run shows the correct terminal reason.

Stopping awaiting a promise is not cancellation.

## 4.7 Independent certificate verification

Preflight certificates are optional solver claims and must be re-derived by the independent validator from the immutable package.

Support only sound, finite certificates:

- required subjects exceed usable capacity;
- a pair/set of mutually table-separated required subjects has too few eligible tables;
- exact contradictory HARD rule pair;
- required subject has no valid table;
- ACTIVE reservation minima exceed bound table capacity.

Every cited subject, table, rule edition, reservation edition and content hash must exist in the package. Invalid certificate cannot produce `INFEASIBLE`; record disagreement and run full search once with preflight disabled or fail safely according to the ADR. Absence of a certificate proves nothing.

## 4.8 Branch B/C/E corrections

Regardless of Branch A if proven:

- no non-database `await` inside transaction callbacks;
- no solver, validator, export, large canonicalisation or page render inside a transaction;
- acquired clients released in `finally`;
- connection acquisition and transaction durations bounded and instrumented;
- event/current lock held only for version/hash verification and writes;
- redirects occur after commit, at top level;
- catches rethrow the framework redirect sentinel;
- `finally` cannot replace a redirect or governed error;
- expected validation/conflict/permission outcomes never become 5xx.

## 4.9 Branch D shared action-result correction, only if proven

Do not create a seating-only mechanism. Extend the existing shared Event OS result contract with additive durable persistence bound to:

- result ID;
- organisation;
- actor;
- stable session ID only if one genuinely exists;
- exact pathname;
- command ID/type;
- outcome;
- permission-safe payload;
- creation/expiry;
- optional acknowledgement/consumption metadata.

Requirements:

- write inside the business command transaction where atomicity is required;
- any Railway replica may read it;
- RSC prefetch/double render cannot consume it before presentation;
- old correlation cannot satisfy a new action;
- navigation to unrelated pathname cannot recall it;
- TTL cleanup affects acknowledgements only, never audit truth;
- shared correction receives S04–S06 regression, not only seating tests.

If Branch D is not proven, do not reopen the shared action-result system.

## 4.10 Additive migration

Use the next unused migration number after inspection. Never edit an applied migration checksum.

Add only fields/tables required by the proven branches, potentially:

- run owner/lease/attempt/cancel/terminal reason/retry link;
- queue/lease indexes;
- validation method/certificate fields and checks;
- shared action-result table only for proven Branch D;
- missing active-edition/package-identity indexes shown necessary by query plans.

Migration must be forward-only, replay-safe, boot-compatible with historic rows and non-destructive. Historic non-terminal records require an explicit compatibility/recovery classification; do not silently mark them successful.

## 4.11 Packet 4 exit gate

Exit only when:

- selected branch tests now pass;
- unchanged S072 truth tests pass;
- timeout genuinely terminates compute;
- no transaction spans solve/validation;
- replay cannot duplicate execution/audit;
- migration is additive/replay-safe;
- production build includes the worker when applicable;
- inline executor is unreachable in production when applicable;
- no unexpected full-suite regression.

Commit by coherent responsibility, not one opaque mega-commit. Continue automatically to Packet 5.

---

# PACKET 5 — Truthful UX, focus, polling and operator recovery

## 5.1 Exact operator states

Use Command Atelier language consistent with the application. Required meanings:

| State | Required meaning | Adopt |
|---|---|---|
| QUEUED | “Seating run queued. Solving has not started.” | hidden |
| RUNNING | run started, elapsed time and fixed budget | hidden |
| COMPLETED + FEASIBLE | independently validated feasible plan | visible only if current |
| COMPLETED + INFEASIBLE | no feasible plan under governing HARD rules; list evidence | hidden |
| TIMED_OUT | computation stopped at its budget; no result produced | hidden |
| CANCELLED | cancelled, actor/time/reason where permitted | hidden |
| ERROR | run failed; no result produced; safe correlation | hidden |
| same-command replay while active | command already received; show original current run state | hidden |
| semantic reuse of completed run | identical governed inputs already solved; no new computation | by verdict/currentness |

Never say “completed”, “succeeded” or “plan ready” for a merely queued run.

## 5.2 Polling

- Poll only while the visible run is non-terminal.
- Prefer a bounded status projection route if full RSC refresh is expensive.
- Stop on terminal/unmount/navigation.
- Backoff or fixed interval must not overload Event OS.
- Polling must not move keyboard focus.
- Polling must not consume or replace the original command result.
- Run updates use an appropriate polite live region without repeatedly announcing unchanged text.

## 5.3 Focus lifecycle

Preserve the already-established correlation-bound focus pattern:

1. a fresh result correlation arrives;
2. target is from a fixed allowlist;
3. wait for stable render;
4. focus the result heading with `tabIndex={-1}`;
5. verify `document.activeElement` is the heading;
6. mark that correlation focused only after success;
7. retry once if necessary;
8. never focus `<body>`;
9. F5 of the same result does not refocus;
10. polling does not refocus;
11. a later new correlation focuses again.

Do not use React `autoFocus` as the sole implementation.

## 5.4 Recovery controls

Where authorised:

- Cancel active run;
- Retry terminal timeout/error using a new command ID with `retryOfRunId`;
- Reload canonical status;
- inspect explicit failure/certificate/validation details;
- never retry automatically after an ambiguous command settlement.

## 5.5 Accessibility and responsive requirements

- 360/768/1440 widths;
- 200% zoom;
- reduced motion;
- no document-level horizontal overflow;
- long hashes wrap;
- state not conveyed by colour alone;
- buttons use real disabled state;
- errors use summary + field association where field-specific;
- keyboard can launch, cancel, inspect and adopt where authorised;
- Auditor remains readable and non-mutating;
- System Administrator remains denied business authority.

## 5.6 Packet 5 exit gate

Focused component/unit/Playwright tests prove exact wording, fresh-correlation focus, no F5/poll focus theft, all terminal states, recovery controls, responsive behaviour and role boundaries. Commit and continue automatically to Packet 6.

---

# PACKET 6 — Evaluation integrity and full local gates

## 6.1 Corpus rule

If run statuses, persistence, execution observations, cancellation, certificates, action-result truth or evaluator cases changed, create a new current corpus edition (expected next: `s06-eval-v4`, but inspect actual current edition and increment exactly once). The prior current run becomes honestly `STALE`; never restamp it.

The corpus must invoke real production commands/repositories/executor composition appropriate to each case. Cases cannot write `passed`, fabricate observations, or call test-only shortcuts that bypass queue/claim/terminal persistence.

## 6.2 Required new cases/mutations

At minimum:

1. launch writes QUEUED before computation;
2. same command replay returns same run and does not spawn;
3. semantic completed reuse performs no computation;
4. new command while same package RUNNING reports in-progress, no duplicate;
5. timeout ends computation;
6. timeout retry creates linked successor run;
7. worker crash becomes ERROR;
8. expired lease requeues within cap;
9. exhausted lease becomes ERROR;
10. cancel queued;
11. cancel running;
12. late lost-owner result discarded;
13. invalid infeasibility certificate rejected;
14. valid impossible-set certificate independently verified;
15. solver says FEASIBLE but validator finds hard violation;
16. unseated required subject violation preserved;
17. transaction not held during solve;
18. unrelated command remains responsive during busy run;
19. action-result redirect/render branch regression if Branch D/E changed;
20. production composition cannot select inline executor.

Mutation adapters are test-only and excluded from production barrels.

## 6.3 Mandatory local gates

Run separately where memory pressure requires; do not hide failures in a combined command:

- focused S073 tests;
- S072 V2 truth/hash/validator/persistence tests;
- current S06 evaluation/readiness/mutation suites;
- `pnpm typecheck`;
- full shared-platform tests, zero failures;
- full Event OS unit tests, zero failures;
- `pnpm programme:validate`;
- Event OS production build;
- `git diff --check`;
- all affected S04–S06 action-result suites if shared result changed;
- local Playwright: diagnostics classification replay, queue/run terminal states, cancellation, concurrency, remaining gates, two publication chains, role/accessibility journeys.

Do not omit a baseline failure as “pre-existing” without proving it existed at the required baseline and obtaining AI CTO authority to carry it. S073 requires zero full-gate failures before deployment.

## 6.4 Performance/concurrency gates

With an intentionally busy run:

- protected diagnostic/status read p95 <100 ms and max <2s;
- governed read and unrelated safe same-event mutation settle <3s each;
- launch acknowledgement settles <1.5s locally and <3s live;
- no transaction >2s; target <300ms;
- zero `idle in transaction` >500ms;
- zero lock/pool wait >1s;
- termination at configured budget ±1s;
- event-loop p99 target <50ms and max <200ms, subject to recorded platform noise; any breach requires explanation and rerun, not assertion deletion;
- CPU returns near pre-run baseline within 2s of termination;
- immediately subsequent command remains responsive.

Do not raise action/test timeouts to pass.

## 6.5 Packet 6 exit gate

All gates and performance proofs pass with zero failures. Preserve every first-run failure, root cause, correction and rerun. Commit application/tests. Do not write the final docs stamp. Continue automatically to Packet 7.

---

# PACKET 7 — Event OS deployment and independent live Phase 13 closure

## 7.1 Pre-deploy

Require local HEAD = origin/main = GitHub `main`, clean worktree, final application commit identified, migrations additive/replay-safe, diagnostic secret handling prepared and Control Tower untouched.

Deploy Event OS only because application code changed. Set `EVENT_OS_GIT_SHA` to the exact application commit without exposing secrets. Verify Railway deployment SUCCESS and health/readiness before authenticated journeys.

If Packet 4 introduced an isolated worker, prove its compiled artefact exists and production composition selects it before launching any run.

## 7.2 Remove temporary diagnostics

The temporary HTTP event-loop diagnostic may remain only for the first live corrected measurement and only under all gates in Packet 2. After proof:

- remove/disable the route in the final application SHA;
- unset the diagnostic token;
- rerun build and focused tests;
- deploy the final SHA;
- confirm the route returns 404.

If permanent non-sensitive operational metrics use an existing protected observability path, document them; do not leave a bespoke public endpoint.

All final live acceptance journeys must run on the diagnostic-removed final SHA.

## 7.3 Fresh synthetic fixture

Do not mutate accumulated Alpha One for adversarial solver gates. Use a governed fixture path that creates or provisions:

- synthetic event with unique S073 label/provenance;
- accepted upstream guest identities;
- RSVP attendance truth;
- current downstream layout with known tables/capacities;
- seating authority assignments;
- no inherited non-terminal S06 run;
- no inherited rules/reservations except those intentionally seeded.

Do not invent an empty event and claim it is adequate. Do not manually insert/delete SQL. Archive only through an existing authorised governed command; otherwise retain clearly classified synthetic history.

## 7.4 Required remaining live gates

Run as independent tests so one failure does not skip another:

### Gate A — impossible HARD set

- construct a mathematically documented empty solution set;
- freeze exact package;
- launch acknowledges QUEUED promptly;
- terminal is COMPLETED + independently INFEASIBLE;
- violations/certificate visible and exact;
- no Adopt control or forged adopt mutation;
- no required guest silently omitted to manufacture feasibility.

### Gate B — assign-unseated and invalid placement

- begin from a feasible independently validated run with a deliberately unseated eligible subject where governed semantics permit assignment;
- valid assignment to eligible capacity persists in immutable successor and revalidates FEASIBLE;
- hard-violating placement is NOT_APPLIED with specific governed reason;
- no assignment/hash/version change after rejection;
- fresh action result, no old banner.

### Gate C — withdrawal, recall and successor

- withdraw active authority against exact ID/version/hash;
- next frozen package omits it;
- recall eligible unchanged plan into a new edition ID with identical material content hash;
- immutable recall lineage/audit retained;
- material successor changes content hash;
- stale and replay behaviours truthful.

### Gate D — implicated specialist

- plan contains a current governed rule that maps to one specialist domain;
- specialist review bound to exact organisation/event/edition/plan hash/domain and governing rule hashes;
- reviewer discovers only assigned event;
- non-implicated specialist cannot decide;
- author self-review denied;
- stale hash/version denied;
- cross-event denied;
- reviewer cannot approve/publish/evaluate/edit.

### Gate E — execution isolation

- start intentionally expensive bounded run;
- while RUNNING, complete one governed read, one unrelated same-event safe mutation and status inspection within targets;
- show no open/idle transaction or material lock/pool wait;
- timeout/cancel actually terminates;
- immediately execute another command successfully.

## 7.5 Full affected publication/replay chain

On the final SHA perform two consecutive, independently labelled sequences:

1. Planner composes/adopts/submits;
2. implicated specialist reviews exact hash only where required;
3. Planner self-review/approval denied as applicable;
4. Event Director approves exact hash;
5. Director publish denied;
6. CEO publishes;
7. identical publish replay preserves publication ID/hash/number and reports no data change;
8. successor WORKING/DRAFT does not hide last-known-good publication;
9. Auditor sees permission-safe publication and cannot mutate;
10. System Administrator has no seating business authority.

Every action must prove one mutation POST, response status, fresh correlation and matching banner. No action over 30 seconds. No old banner. No silent reload as sole evidence. Do not increase timeouts.

## 7.6 Live evaluation

Before running the new/current corpus, prove prior corpus state is STALE if the contract advanced. Run once as authorised CEO. Require:

- correct edition/contract/hash;
- expected count persisted exactly;
- zero failures;
- zero-tolerance clear;
- blocked false;
- release-ready true;
- reload/reopen retains PASSED;
- unauthorised roles cannot run it;
- fixture assurance copy does not imply production authorisation.

## 7.7 Packet 7 hard stop

If any required live gate fails once after a properly instrumented attempt:

- record first-run failure;
- identify exact stage/root cause;
- correct only if already authorised by a proven S073 branch;
- rerun all affected gates on the new SHA;
- if correction requires a new architecture, service, secret, destructive migration or third executor option, stop for AI CTO review.

Do not proceed to Packet 8 while any gate is unfinished or failing.

---

# PACKET 8 — Freeze, control records and final stop

## 8.1 Final gates

On the exact final application/live SHA rerun:

- typecheck;
- full shared-platform tests;
- full Event OS tests;
- programme validation;
- Event OS build;
- `git diff --check`;
- focused S073 regression;
- changed-risk S072 journeys;
- final health/readiness;
- both publication/replay sequences if any post-proof application change occurred;
- current evaluation readiness if any post-proof application change affected it.

Require local HEAD = origin/main = GitHub main at the application commit before deploy. A later documentation-only stamp may move GitHub main without redeploy, but must be explicitly distinguished from the deployed application SHA.

## 8.2 Control records

Update only the appropriate S06 implementation/build/evidence/current-state/roadmap/compatibility/authority/technical-debt records. Preserve all prior first-run failures and NOT READY reports. Do not rewrite history.

Record:

- authority file SHA-256;
- starting/application/deployed/docs SHAs;
- diagnostic branch evidence;
- ADR;
- migration ID/checksum;
- executor/validator/config/corpus versions and hashes;
- first-run failures;
- live timings;
- two publication identities and replay evidence;
- remaining debt;
- rollback and forward recovery;
- production/providers state.

Do not create `EOS_S06_ACCEPTANCE.md`.

## 8.3 Required final report order

1. baseline and parity;
2. authority placement/hash;
3. commits/files by packet;
4. repository truth map;
5. diagnostic timeline and exact branch finding;
6. rejected hypotheses;
7. ADR and chosen correction;
8. migration/repository/transaction boundaries;
9. execution isolation/build packaging;
10. cancellation/lease/reaper proof;
11. solver claim versus independent validator/certificates;
12. replay/retry/idempotency truth;
13. action-result/redirect correction or proof it was not reopened;
14. UX/focus/polling/accessibility;
15. evaluation edition/hash/count/mutations/readiness;
16. local gates;
17. every first-run failure;
18. live remaining-gate evidence;
19. two publication/replay sequences;
20. Railway deployment/health/providers/production state;
21. retained debt and recovery;
22. explicit Claude/acceptance/EOS-S07 stop.

If every non-sealed gate passes, headline:

`READY FOR INDEPENDENT HOLDOUT AND CLAUDE`

Otherwise:

`NOT READY FOR CLAUDE`

and identify the exact unfinished gate. Do not use a partial READY verdict.

End exactly:

`EOS-S06 MD-PR-S073 LIVE COMMAND SETTLEMENT AND PROCESS ISOLATION COMPLETE — READY FOR INDEPENDENT HOLDOUT AND CLAUDE ONLY IF EVERY NON-SEALED GATE PASSED — NOT ACCEPTED — EOS-S07 NOT STARTED.`

---

# 9. Global hard stops and prohibited shortcuts

Cursor must stop and report if:

- baseline/parity/live identity is wrong;
- diagnosis does not select an authorised branch;
- a destructive migration or manual SQL repair appears necessary;
- a new Railway service/external provider/secret model is required;
- worker and sibling-process options are both unsuitable;
- production becomes authorised;
- real data appears;
- any final gate remains failing.

Prohibited:

- increasing test/action/solver timeouts to obtain a pass;
- implementing worker isolation before Branch A evidence;
- introducing Prisma or another ORM merely to follow examples;
- creating a seating-only action-result system;
- leaving a public diagnostic endpoint;
- logging PII, secrets, form contents or sensitive headers;
- enabling inline solver execution in deployed Event OS;
- running solver/validator inside a transaction;
- `Promise.race` presented as cancellation;
- treating timeout as terminal while compute continues;
- allowing two workers to claim one run;
- overwriting terminal run/history;
- solver self-certification;
- trusting an unverified infeasibility certificate;
- mixing run execution status with validation verdict;
- weakening HARD constraints or unseating subjects to manufacture feasibility;
- accepting old banners, cookies or appeared-after-reload as fresh action evidence;
- claiming a queued run completed;
- hiding last-known-good publication with a draft;
- automatically retrying an ambiguously settled mutation;
- using empty events as realistic seating fixtures;
- deleting immutable synthetic history;
- restamping an old evaluation pass;
- deploying Control Tower;
- running Claude or sealed holdout;
- accepting EOS-S06;
- starting EOS-S07.

