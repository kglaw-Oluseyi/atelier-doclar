# MD-PR-S064 — EOS-S05B Mutation Isolation and Full-Gate Recovery

## 0. Authority and outcome

This is the sole implementation authority for MD-PR-S064.

Repository: `kglaw-Oluseyi/atelier-doclar`  
Branch: `main`  
Required starting SHA: `9306ab58c2b0073c825e824ac00f6d7fc2786ae4`  
Railway project/environment/service: `atelier-doclar` / `production` / `event-os` only  
Live URL: `https://event-os-production-bc8d.up.railway.app`

EOS-S05B is **not accepted**. EOS-S06 is **not authorised and must not be started**. Cursor must not self-accept the slice.

The S063 live dossier chain is materially successful, but S063 reported a mandatory full-gate failure: the shared-platform suite completed with **492 passing and 5 failing tests**, involving access-lifecycle compare-and-swap and persistence optimistic-conflict behaviour. Calling these failures “pre-existing at baseline” does not close the gate. EOS-S05B is still unaccepted, and transaction isolation/concurrency failures cannot be waived as inherited debt.

The required outcome is:

1. reproduce and identify all five failures on the exact baseline;
2. correct the common mutation-isolation defect without weakening tests;
3. prove that failed, stale, forbidden and rolled-back mutations cannot alter canonical state;
4. preserve the S063 command-scoped dossier repository and its live performance;
5. make the complete shared-platform suite pass with zero failures;
6. run all required gates, push, deploy Event OS only, run focused live changed-risk evidence, and stop for independent review.

Do not run Claude. Do not create an acceptance record.

## 1. Mandatory baseline procedure

Before editing:

1. Fetch normally and verify:
   - local `HEAD`;
   - `origin/main`;
   - GitHub `main`;
   - clean worktree, apart from this authority file if George placed it in the repository root.
2. All three SHAs must equal `9306ab58c2b0073c825e824ac00f6d7fc2786ae4`.
3. If this file is in the repository root, move it unchanged to:
   `docs/control/eos-s05b/MD_PR_S064_EOS_S05B_MUTATION_ISOLATION_AND_FULL_GATE_RECOVERY.md`
4. Verify the live Event OS SHA is `9306ab58c2b0073c825e824ac00f6d7fc2786ae4`, or report an exact discrepancy before changing code.
5. Do not touch another repository, Railway project or service.

If unrelated local changes overlap the affected files, stop and report them. Do not reset, discard or overwrite George’s work.

## 2. Reproduce before repair

Run the complete shared-platform suite on the unmodified baseline and preserve the exact evidence for every failure:

```bash
pnpm --filter @maison-doclar/shared-platform test
```

Record for each of the five failures:

- test file and exact test name;
- expected and actual result;
- mutated aggregate/table/record;
- whether the failure follows a domain rejection, stale version, persistence rejection, audit failure or replay;
- whether the in-memory canonical snapshot differs after the failed operation;
- whether object identity is aliased between the canonical snapshot, command working state, returned result and persisted record.

Do not change assertions, update snapshots, skip, quarantine, rename or delete a failing test to obtain a green run. Do not classify the failures as non-blocking merely because they existed at the baseline.

Add a short failing-mechanism note to the final report before implementing the correction. The likely shared mechanism is aliasing introduced when S062 removed `structuredClone`, but Cursor must prove the actual path rather than merely repeat that hypothesis.

## 3. Non-negotiable state-isolation contract

The following invariant applies to every generic mutation path that remains in `PlatformService`, every in-memory store, and every normalized Postgres persistence adapter:

> A command may mutate only an isolated working state. Canonical observable state may advance only after the command, optimistic concurrency check, durable domain writes, append-only audit write and idempotency receipt all succeed. Any error leaves canonical state observably identical to the pre-command state.

Implement and test these exact consequences:

### 3.1 No mutation through borrowed references

- `store.snapshot()` must not expose mutable references that a command can change in place.
- A command working copy must not share mutable nested objects or arrays with the canonical snapshot.
- Returned command results and projections must not share mutable references with stored canonical records when caller mutation could change durable or in-memory truth.
- A no-op replay must not mutate timestamps, versions, state, audit lineage or idempotency records.

### 3.2 Atomic failure semantics

For each of the following, canonical state must remain deep-equal to the pre-command state and retain the same relevant versions/hashes:

- domain validation throws after an earlier nested working-state mutation;
- permission or maker/checker denial;
- stale `expectedVersion` / optimistic concurrency conflict;
- durable insert/update failure;
- audit append failure;
- platform idempotency receipt failure;
- risk idempotency receipt failure;
- unexpected exception before commit;
- two concurrent writers where only one may win.

There must be no ghost grant, ghost revocation, ghost publication, changed version, changed `current` marker, partial audit, false success or mutated cached snapshot after the losing/failed command.

### 3.3 Success semantics

On success:

- state advances exactly once;
- audit and required idempotency receipts are committed consistently with the domain write;
- replay returns the original durable IDs and reports `REPLAYED` / `didDataChange: false` where that action contract applies;
- a caller mutating the returned JavaScript object afterward cannot mutate canonical state.

## 4. Required architecture boundary

Do **not** undo S063.

The following S063 architecture must remain:

- `RiskDossierCommandService` and `RiskDossierRepository` remain the production path for affected dossier, publication and client-access commands;
- bounded organisation/event/ID queries remain in place;
- `FOR UPDATE` remains where currentness matters;
- optimistic versions remain server-enforced;
- audit plus `platform_idempotency` and `risk_idempotency_receipts` remain in one database transaction;
- no full `PlatformService.mutate()` → full snapshot hydrate → full delta path is reintroduced for those commands;
- the shared domain decision functions remain common to snapshot helpers and repository commands so policy is not forked.

Repair the legacy/generic mutation boundary separately.

An acceptable minimal correction is to restore a genuinely isolated deep working copy for legacy generic `PlatformService.mutate` calls while leaving S063 repository commands direct and bounded. If `structuredClone` is used, it must clone **before** any command code executes and canonical replacement must happen only after successful persistence. If a copy-on-write or explicit transaction workspace is used instead, prove equivalent isolation for every nested collection and object.

Do not optimise by returning the store’s canonical object and trusting callers not to mutate it. Do not repair tests with shallow spreads. Do not catch a persistence conflict after canonical state has already been altered. Do not rebuild a second Postgres policy engine.

## 5. Access-lifecycle and CAS repair

Inspect every failing access-lifecycle test and the complete issue/use/revoke/renew/message sequence, including:

- grant token hash/prefix and permitted projection;
- expiry and failure counters;
- revoke version and revoked state;
- client note/message creation;
- cross-event and cross-organisation denial;
- idempotent issue/revoke replay;
- concurrent revoke/use or renew/revoke attempts;
- stale `expectedVersion`.

Make the smallest domain-correct repair. Specific requirements:

1. A stale access command returns a governed conflict and cannot mutate the grant.
2. A rejected client request cannot increment or reset counters unless that exact counter mutation is the authorised durable outcome.
3. A failed revoke cannot make a still-current grant appear revoked in memory.
4. A successful revoke is durable and a separate client session is denied on refresh.
5. A failed or replayed command must not create a second success audit.
6. Session, actor, organisation, event and grant scope remain server-authoritative.
7. Token plaintext must not enter prompts, logs, screenshots, audit or test reports.

## 6. Mandatory regression tests

Preserve the original five failing tests unchanged and make them pass. Add focused regression coverage only where the existing tests do not directly prove the following:

### 6.1 In-memory isolation

- Capture a canonical snapshot and stable digest.
- Begin a command that changes at least two nested fields/collections in its working state.
- Throw before commit.
- Assert canonical deep equality and digest equality.
- Assert no audit/idempotency residue.
- Mutate the command’s returned object and prove the store is unchanged.

### 6.2 Persistence rollback

- Inject failure after domain row work but before audit/receipt completion.
- Assert the database transaction rolls back every inserted/updated row.
- Rehydrate and prove no partial state.

### 6.3 Optimistic concurrency

- Run two operations from the same starting version.
- Exactly one applies.
- The loser reports conflict / not applied.
- Rehydrate and prove only the winner’s state, one success audit and one applicable idempotency outcome.

### 6.4 Replay

- Repeat an identical key and semantic command.
- Assert same durable identifiers, unchanged versions/timestamps, no second write, truthful replay receipt.

### 6.5 Direct S063 path

- Prove dossier assemble/submit/approve/publish/replay and grant/revoke still use the command-scoped repository.
- Add a guard test or instrumentation assertion that fails if these actions regress to whole-snapshot hydration.
- Preserve last-known-good publication while a successor DRAFT exists.

Tests must assert durable reload, not only the object returned by the command.

## 7. Full local gates — zero failures required

Run focused tests during development, then run every final gate from a clean application state:

```bash
pnpm typecheck
pnpm --filter @maison-doclar/shared-platform test
pnpm --filter @maison-doclar/event-os test
pnpm programme:validate
pnpm --filter @maison-doclar/event-os build
git diff --check
```

The full shared-platform result must be **0 failed**. “492 passed / 5 failed”, “pre-existing”, “unrelated”, “flaky” or “passes in isolation” is not a completed gate.

Run focused browser coverage for changed risk only:

- S063 command-scoped dossier journey;
- client grant/session/revoke journey;
- one stale-write conflict with no ghost mutation;
- one idempotent replay;
- S058 human-safe validation if shared action/error handling changes.

Long suites may run separately to avoid the known local memory-pressure restart, but every named suite must pass. Record any first-run failure honestly with root cause and correction.

## 8. Evaluation and compatibility

Do not change or restamp `s05b-eval-v6` merely to obtain readiness.

Current expected corpus:

- edition `s05b-eval-v6`;
- 63 cases;
- hash `987f4b6d1c4747074d750eb96a37df48e223627fd069003f75462c0769f15e04`.

If the repaired code changes a contract, probe, corpus input or output on which v6 depends, advance the corpus honestly and run it. Otherwise preserve v6 and verify the durable current pass remains compatible after deployment. Never rewrite or restamp an old evaluation result.

## 9. Git, deployment and live verification

Commit in focused, reviewable commits and push normally. No force-push, history rewrite, destructive reset or amendment of accepted commits.

Deploy **Event OS only** because shared-platform runtime code affects Event OS. Do not deploy Control Tower unless its executable code was actually changed; this authority does not request such a change.

Before deployment:

- local HEAD = `origin/main` = GitHub `main`;
- full gates pass;
- worktree clean.

After deployment verify:

- exact deployed application SHA;
- `alive: true` and `ready: true`;
- `persistence: POSTGRES`;
- migrations `APPLIED`;
- `productionAuthorised: false`;
- S05A remains `PASSED`;
- S05B evaluation is current and release-ready under the rules in §8;
- providers remain INACTIVE;
- only `event-os` was deployed.

Run only the focused changed-risk live evidence:

1. stale or rejected mutation produces no ghost state after reload;
2. access grant issue → separate client session → revoke → denied refresh remains durable;
3. one Planner assemble/submit → Director approve → CEO publish/replay chain remains correct;
4. a successor DRAFT leaves the last-known-good published client dossier available;
5. steady-state dossier mutations remain under 10 seconds, focused dossier GET under 3 seconds, and no action exceeds 30 seconds;
6. no 503 and no false-success receipt.

Use uniquely labelled synthetic data only. Do not invoke communications, payments, bookings, claims, emergency dispatch, insurer contact, biometrics or any external provider. Do not change `productionAuthorised`.

## 10. Required final report

Return one consolidated report containing:

1. starting and final SHAs;
2. exact list of commits and material files;
3. the five baseline test names and their original failure evidence;
4. proven root cause, including any object/reference aliasing;
5. the final isolation/commit architecture;
6. proof that S063 direct repository commands were not regressed;
7. focused test evidence for failure rollback, optimistic concurrency, replay and returned-object isolation;
8. complete full-gate results, with **zero shared-platform failures**;
9. every first-run failure and correction;
10. GitHub parity;
11. Event OS deployment ID, exact SHA and readiness;
12. evaluation edition/hash/count/status and whether it was legitimately rerun;
13. focused live evidence and timings;
14. confirmation that Control Tower was not deployed;
15. rollback and forward-recovery route;
16. explicit statements: Claude not run, EOS-S05B not accepted, EOS-S06 not started, production unauthorised.

If any full gate fails, any failed mutation leaks canonical state, the S063 path regresses to whole-snapshot execution, or any live changed-risk gate fails, report **NOT READY FOR CLAUDE** and stop. Do not explain the failure away.

## 11. Completion statement

Use this exact posture only if every requirement above passes:

`EOS-S05B MD-PR-S064 MUTATION ISOLATION AND FULL-GATE RECOVERY COMPLETE — ZERO FULL-SUITE FAILURES — READY FOR AI CTO REVIEW AND FINAL FOCUSED CLAUDE VERIFICATION — NOT ACCEPTED — EOS-S06 NOT STARTED.`

