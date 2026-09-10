# MD-PR-S056 EOS-S05B Durable Truth and Evaluation Integrity

**Status:** CEO-visible focused remediation authority  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Branch:** `main`  
**Required baseline:** `24cc06db961986d93a60324b3101b79bc1c8c06d`  
**Current deployed Event OS application SHA:** `6077a752955fa50f145943349b430a8a2a39efae`  
**Railway:** `atelier-doclar / production / event-os` only  
**Slice:** EOS-S05B not accepted; EOS-S06 not started

## 1. Purpose

MD-PR-S055 materially improved EOS-S05B but did not close three blocking risks: immutable Postgres durability, preservation of governing Budget truth, and evaluator independence. Fix these specific defects before whole-slice Claude verification. Preserve all unrelated S05B work and accepted slices.

Execute the complete pack continuously. Do not ask for module-by-module approval. Claude must not run until the final report has been reviewed by the AI CTO.

## 2. Confirmed defects

### 2.1 Postgres diff persistence is destructive and non-atomic

In `PostgresRiskProtectionStore.persistCollection`, records present in the previous snapshot but absent from the next snapshot are deleted:

```ts
for (const existed of prevRows) {
  if (nextIds.has(existed.id)) continue;
  await tx.query(`DELETE FROM ${table} WHERE id=$1 AND version=$2`, ...);
}
```

This permits an incompletely hydrated or stale in-memory snapshot to delete immutable evidence, editions, audit-bearing decisions or history. It is incompatible with append-only/supersession doctrine.

`putIdempotency` launches an unawaited async write, while `persistFromSnapshotAsync` uses a separate transaction. Domain mutation, audit and idempotency are therefore not proven atomic.

### 2.2 Budget governing truth is not proven unchanged

`projectRiskBudgetOnSnap` calls `calculateBudgetScenarioOnSnap`, then asserts `governingScenarioUnchanged: true`. Its guard checks only status and cannot catch changes to `current`, version, hash, updated time or other fields. The first guard is unreachable for a record selected as current approved/published. The second compares only status and may compare the same mutated object reference.

### 2.3 Evaluation remains self-fulfilling

Examples in `observeProductionState`:

- `REPLAY_SAME_IDS` emits the expected sentence whenever a Budget record exists; it does not compare two invocation result IDs.
- `UNICODE_NFC` returns the passing sentence when the source title contains no Yorùbá test value.
- `CROSS_EVENT_DENIED` is inferred from the absence of a row labelled `LEAKED_OTHER_EVENT`; no forbidden production read/command is invoked.
- several corpus cases use identical actions and expectations despite titles claiming different behaviours.
- accessibility is represented by a domain policy-creation observation, not a browser accessibility probe.

Case count therefore overstates independent executable coverage.

## 3. Durable Postgres correction

### 3.1 Remove deletion-by-absence

Delete the generic missing-row `DELETE` path. No risk record may be physically deleted because it is absent from a next snapshot. State changes occur through explicit commands:

- immutable editions are inserted;
- previous current editions are demoted/superseded explicitly in the same transaction;
- revocation/withdrawal/expiry/closure is an allowed versioned transition;
- genuine erasure, if ever authorised, requires a separate retention command outside this slice.

Add a regression test where `next` is deliberately partially hydrated. Persisting it must not remove any existing row.

### 3.2 Command-scoped repository operations

Do not accept the reported debt that production still mutates a cloned whole snapshot and later diffs it for all tables. For S05B production mutations, add repository transaction methods at aggregate boundaries. At minimum:

```ts
interface RiskTransaction {
  loadAggregate<T>(kind: RiskAggregateKind, id: UUID, scope: Scope): Promise<T | undefined>;
  insertImmutable(kind: RiskAggregateKind, record: Versioned): Promise<void>;
  updateVersioned(kind: RiskAggregateKind, id: UUID, expectedVersion: number, patch: SafePatch): Promise<void>;
  appendAudit(record: AuditRecord): Promise<void>;
  getIdempotency(scope: Scope, action: string, key: string): Promise<IdempotencyReceipt | undefined>;
  insertIdempotency(receipt: IdempotencyReceipt): Promise<void>;
}

interface RiskProtectionRepository {
  transaction<T>(work: (tx: RiskTransaction) => Promise<T>): Promise<T>;
}
```

The same database transaction must apply the domain insert/update, current-edition demotion, audit record and idempotency receipt. Unique-key collision returns the existing truthful result or a key/payload conflict; it must not create a second effect.

Keep memory adapters for evaluation. Compatibility snapshot projection may remain for read assembly, but it is not the production write authority.

### 3.3 Schema-level protections

Add or verify constraints for current-edition uniqueness, scope, valid status, non-negative version and maker/checker where the fields are materialized. Generic `body JSONB` may hold subordinate value objects, but identity, scope, version, status, current, parent/hash and protected decision identities must be queryable columns.

Test transaction rollback after domain write but before audit/idempotency; nothing persists. Test two concurrent writers; exactly one applies. Test replay; no new audit success is manufactured.

## 4. Budget Intelligence correction

### 4.1 Snapshot the governing edition before calculation

Deep-clone and hash the complete governing approved/published scenario edition before invoking any calculation. After the risk successor is created, reload the original edition by ID and assert exact equality for at least:

```text
id
status
current/governing designation
version
content/result hash
updatedAt
approved/published lineage
effective drivers
calculation result association
```

Do not compare two aliases to the same mutable object.

### 4.2 Non-governing branch semantics

If the accepted Budget engine currently makes every new calculation the current working scenario, extend it with an explicit governed branch mode such as:

```ts
calculateBudgetScenarioOnSnap(..., {
  branchFromScenarioEditionId: governing.id,
  activateAsCurrent: false,
  purpose: "PROTECT_INVESTMENT"
})
```

The risk successor is immutable and reviewable but does not displace governing approved/published Budget truth until a separately authorised Budget decision adopts it. Do not fake preservation with a Boolean field.

### 4.3 Calculation result identity

Persist and project both `successorScenarioEditionId` and the real `calculationResultId`. Do not use the scenario ID as a calculation-ID surrogate. Quantified values and traces must be copied from the named accepted-engine result.

### 4.4 Tests

Prove:

- original governing edition deep-equals its pre-call snapshot;
- risk successor/result exist and reference the governing lineage;
- sourced lines appear in the accepted engine trace and totals;
- unknown exposure remains unknown;
- identical invocation returns the same scenario and calculation IDs/generated time with `REPLAYED/didDataChange:false`;
- changed input creates a new immutable branch successor;
- stale governing hash/version is `NOT_APPLIED` and creates nothing;
- no risk collection is a competing financial authority.

## 5. Evaluation integrity correction

### 5.1 No observation may know expected prose

Remove sentence-equality assurance. `RiskObservation` must contain raw typed facts only. Assertions compare fields/operators, not a sentence written by the action branch.

Replace:

```ts
{ kind: "TEXT", code: "REPLAY_SAME_IDS", value: "identical budget request replays" }
```

with observations such as:

```ts
{ kind: "INVOCATIONS", action: "risk.budget.project", firstResultId, secondResultId,
  firstApplication, secondApplication, firstGeneratedAt, secondGeneratedAt,
  firstRecordCount, secondRecordCount }
```

The assertion engine independently requires ID/time/count equality and `secondApplication === "REPLAYED"`.

### 5.2 Required probe corrections

- **Unicode:** create decomposed input deliberately; observe stored code points/normalization and exact round-trip. Missing test text fails.
- **Cross-event:** use an actor assigned only to Alpha One to call the real Alpha Two projection/command. Observe thrown code, no returned forbidden value, no mutation and denied audit.
- **Cross-organisation:** same using the other organisation.
- **Prompt injection:** feed a document/filename/body containing a concrete instruction to the actual extraction/render path; observe no command/tool/authority change and inert escaped output.
- **Replay:** capture both actual invocation results, IDs, applications, timestamps and record/audit counts.
- **Life safety:** inspect external-effect/outbox/audit state and rendered copy; do not infer success from `lifeSafety === true`.
- **Dossier hash/state:** capture each transition, actor, hash and publication record; invalid jump must call the real command.
- **Expiry/revocation/changed hash:** actually advance time, revoke, change inputs and reevaluate.
- **Fact/claim separation:** create both types and inspect immutable classification/projection.
- **Accessibility:** keep it out of the domain corpus unless an executable DOM/browser probe supplies the observation; browser coverage may be a separately required release gate.

### 5.3 Corpus honesty

Audit all 52 cases. A distinct case must have actions and assertions capable of proving its title. Consolidate duplicates that prove the same invariant; add real actions for the missing title claims. Do not preserve 52 as a vanity number. Report the honest final count and register.

### 5.4 Mutation sensitivity

`detectUnsafeFromObservations` receives observations only. Tests must not pass the adapter configuration to any detector/assertion path. For every negative adapter:

1. run clean production path and assert pass;
2. run the mutated dependency;
3. collect the same typed probes, without telling probes which mutation ran;
4. assert the evaluator fails the expected invariant from observed state;
5. prove the mutation cannot return its own `passed` field.

Remove/deprecate any compatibility function whose signature accepts sabotage flags for detection.

## 6. Readiness and live gate

These changes require a new corpus/contract edition, for example `s05b-eval-v3`. The current v2/unrun status and any prior pass must become honestly `STALE` or `INCOMPATIBLE`. Release remains blocked until the current corpus runs through the authorised CEO fixture on the deployed application.

The ready endpoint must expose edition, hash, case count, persisted result count, zero-tolerance status, blocked reasons and release-ready truthfully.

## 7. Focused browser coverage

Do not repeat the whole local suite unnecessarily. Add changed-risk Playwright for:

1. risk Budget branch shows governing edition unchanged and named successor/result provenance;
2. replay returns no-change and same identifiers;
3. stale tab produces an action-scoped conflict and no new successor;
4. dossier cannot skip submit/approve and requires distinct roles;
5. current published dossier export/download remains permission-safe;
6. CEO evaluation panel shows fail-closed before run and current PASS after run.

Run the existing S05B focused suite as regression after these pass.

## 8. Full gates deployment and report

Run focused tests, typecheck, complete shared-platform and Event OS tests, programme validation, Event OS build, `git diff --check`, changed-risk Playwright and the existing focused S05B browser suite. Record every first-run failure.

Commit/push normally and prove local = origin = GitHub main. Deploy Event OS only. Verify exact application SHA, POSTGRES, SQL migrations APPLIED, production false, providers inactive and the new corpus fail-closed.

The final report must include:

- exact Postgres commands/transactions replacing snapshot diff writes;
- proof that missing rows are never physically deleted by snapshot absence;
- transaction rollback/concurrency/idempotency evidence;
- before/after deep comparison of governing Budget edition;
- real successor scenario and calculation IDs;
- complete evaluator case-to-action-to-typed-probe register;
- mutation tests proving probes never receive sabotage configuration;
- honest corpus edition/hash/count and current live run;
- full gates, SHAs, deployment/readiness and live synthetic smoke;
- every first-run failure and retained debt;
- Claude not run, EOS-S05B not accepted, EOS-S06 not started.

## 9. Stop conditions and prohibitions

Stop only for baseline mismatch, overlapping worktree, destructive data action, required human secret, real/external-effect risk or controlling contradiction. A production access token needed only for live browser verification is a legitimate final-stage human handoff, not permission to skip local or unauthenticated gates.

Do not delete history, reset Postgres, restamp a stale evaluation, activate providers, use real data, deploy Control Tower, accept EOS-S05B or start EOS-S06.

Finish with:

`EOS-S05B MD-PR-S056 DURABLE TRUTH AND EVALUATION INTEGRITY COMPLETE — READY FOR AI CTO REVIEW AND WHOLE-SLICE CLAUDE VERIFICATION — NOT ACCEPTED — EOS-S06 NOT STARTED.`
