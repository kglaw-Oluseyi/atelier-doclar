# MD-PR-S062 — EOS-S05B Governed Synthetic-Authority Recovery and Live Completion

## 0. Authority

This is a focused execution authority following MD-PR-S061. Execute continuously and stop only after the exact live gates below pass or a genuine new blocker is evidenced.

Do not renew obsolete synthetic QA rules merely to make readiness green. Preserve their history and withdraw them through the governed rule lifecycle.

EOS-S05B remains **NOT ACCEPTED**. Claude must not be run. EOS-S06 must not be started.

## 1. Baseline and strict scope

- Repository: `kglaw-Oluseyi/atelier-doclar`
- Branch: `main`
- Required local/origin/GitHub/live baseline: `abfdf2469dcfea9ec184337da0baca3c5873907e`
- Railway: `atelier-doclar` / `production` / `event-os` only
- Current deployment: `8fbd4fef-c92a-4dfc-b879-a10b05aa7a39`
- Control Tower must not change or deploy.

Verify exact parity and a non-overlapping worktree. Stop on discrepancy.

## 2. Exact live records and required disposition

The following retained rule keys are synthetic S060 test artefacts and are not continuing Maison Doclar governing policy:

- `s060-public-liability-1789063488182`
- `s060-public-liability-1789063559605`
- `s060-public-liability-1789063730645`
- `s060-public-liability-1789063780841`

Their governing edition IDs reported by S061 are:

- `e7ef2ced-8670-443d-aee1-2354fea9fd42`
- `85431a29-828e-47b2-8791-1170caf2fa73`
- `a1e7a811-821c-4131-b4de-ab3e1e303d00`
- `54326e94-75e4-4eba-a3be-a8b3052d872c`

Resolve these IDs again from the live authority projection before action. Do not trust the prompt if their version/status/identity changed.

Required disposition: **WITHDRAWN as obsolete synthetic QA authority**, with a reason that states the exact S060 test lineage. Do not delete, rewrite dates, mark APPROVED, extend review dates, or fabricate a fresh legal review.

The following records are not included in that withdrawal:

- `CLAUDE-S05B-S059-B-RULE` — no approved authority; retain as history only;
- `s061-public-liability-1789066558518` / edition `64d4a54b-c833-4826-8756-76699ec794c2` — current approved S061 synthetic authority;
- any other rule/source not explicitly previewed and selected.

## 3. Focused authority work queue

The current organisation Protection page is too expensive and operationally poor for repeated review. Implement a focused, query-backed authority queue.

### 3.1 Routes

Add:

- `/app/protection/authority` — paginated/filterable governing-authority queue;
- `/app/protection/authority/[ruleEditionId]` — focused rule authority detail and decision;
- an equivalent focused source detail link where the governing rule cites an expired source.

Do not render or hydrate the full historic catalogue for one decision.

### 3.2 Projection

Create a narrow projection returning only:

```ts
type RiskAuthorityQueueItem = {
  ruleKey: string;
  governingEditionId?: string;
  governingVersion?: number;
  authorityState:
    | "CURRENT_APPROVED"
    | "STALE_APPROVED"
    | "AUTHORITY_CONFLICT"
    | "WITHDRAWN_NO_AUTHORITY"
    | "NO_APPROVED_EDITION";
  propositionSummary: string;
  sourceSummaries: Array<{
    id: string;
    label: string;
    status: string;
    reviewDueAt?: string;
  }>;
  reviewDueAt?: string;
  isSyntheticFixture: boolean;
  syntheticLineage?: string;
  permittedActions: Array<"REVIEW_SUCCESSOR" | "WITHDRAW" | "INSPECT_HISTORY">;
};
```

The server query must:

- scope by organisation;
- paginate with a stable cursor-deterministic cursor/order;
- filter by authority state and rule key;
- return a summary count for hidden history, not all historical bodies;
- fetch full history only on the focused detail route;
- omit protected internals for Auditor;
- deny System Administrator.

If the current `PlatformService` snapshot query cannot avoid hydrating all rows, add a narrow normalized Postgres repository query for this read surface. Do not introduce a second write path. Mutations remain canonical risk transactions.

### 3.3 Decision form

On focused detail, expose only actions authorised by the current state and role.

Withdrawal form must include:

- exact edition ID and current version;
- exact content hash confirmation;
- reason;
- consequence copy: removes future governing authority; retains immutable history;
- no bulk wildcard/glob action.

Use the Risk Governance Reviewer, not CEO self-approval and never System Administrator.

### 3.4 Optional exact-selection batch

A batch action is permitted only if it:

- receives an explicit array of exact edition IDs + expected versions + hashes;
- previews every selected row before confirmation;
- rejects any row not marked synthetic fixture lineage;
- rejects cross-org, non-current or changed rows;
- is atomic: one mismatch means none are withdrawn;
- writes one decision audit per edition plus a correlated batch receipt;
- is idempotent for the exact payload;
- never accepts a prefix, query filter, date range or “all”.

This batch is for the four exact S060 rows only. It must not become a generic cleanup tool.

## 4. Synthetic authority provenance

Do not infer “synthetic” merely from a string prefix in production authority decisions.

Add or use explicit provenance:

```ts
type RiskFixtureProvenance = {
  environment: "NON_PRODUCTION_FIXTURE";
  testRunId: string;
  authorityPromptId: string;
  createdByAutomation: boolean;
};
```

For existing four S060 rows, create an additive, auditable classification receipt that binds their exact IDs/hashes to S060 test evidence. Do not modify their original author/content/timestamps.

Production-authorised mode must forbid fixture-provenance creation and synthetic batch withdrawal.

## 5. Prevent future live-test authority pollution

Update live S05B browser tests:

1. Do not create timestamp-named organisation-wide approved rule keys for ordinary UI testing.
2. Rule-authoring UI tests may create DISCOVERY drafts without making them governing.
3. Maker/checker live tests must reuse one stable canonical fixture rule lineage per test purpose.
4. If an approved synthetic authority is required, record explicit fixture provenance and withdraw it through a `finally` recovery helper.
5. The helper must be safely rerunnable after interruption and operate only on its exact recorded IDs.
6. Test start must detect and report an unfinished prior fixture lineage rather than creating another competing rule.
7. Never weaken the effective-authority selector to ignore records solely because their names look synthetic.

Add a test proving two interrupted runs cannot accumulate multiple governing fixture rules.

## 6. Re-evaluation after withdrawal

After the four exact withdrawals:

1. reload the authority queue;
2. prove each is WITHDRAWN and absent from effective governing input;
3. prove its immutable history remains available;
4. prove the S059 DISCOVERY rule remains history-only;
5. prove the S061 current approved rule remains the selected authority;
6. explicitly run event applicability;
7. inspect the new snapshot’s selected rule/source IDs and content hash;
8. confirm no stale state remains unless a genuinely current authority is still expired;
9. if a different genuine stale authority remains, stop and report it—do not auto-renew or withdraw it.

Do not force READY. The state must emerge from the corrected authority set and current evidence.

## 7. Complete the live dossier chain

Only after §6 is truthful:

1. as Planner, assemble a new uniquely labelled S062 dossier edition;
2. verify a DRAFT is created while the previous current publication remains client-visible;
3. submit it;
4. prove Planner cannot self-approve;
5. as Event Director, approve the exact submitted hash;
6. prove Event Director cannot publish;
7. as CEO, publish the exact approved hash;
8. repeat publish and prove same publication identity/no duplicate;
9. create a successor DRAFT and prove the S062 publication remains client-visible;
10. refresh/reopen and verify durability.

No step may return 503. Record all actor identities, hashes, versions, publication IDs/numbers and correlations.

## 8. Complete separate client-access journey

Using the successfully published S062 dossier:

1. CEO issues one synthetic client dossier grant without sending;
2. confirm only the token hash/grant metadata persists;
3. George enters any plaintext token directly; Cursor must never print it;
4. establish a separate client session with no staff authority;
5. verify the current S062 publication is visible;
6. verify unpublished successor, policy identifiers, object keys, staff evidence and other events are absent;
7. record a synthetic acknowledgement/question;
8. confirm it does not mutate staff truth or dispatch communication;
9. revoke the grant as authorised staff;
10. confirm the existing client session/token is denied afterward;
11. confirm wrong-event/wrong-org access is denied.

Use independent browser contexts locally/live. Shared-cookie simulation is not sufficient.

## 9. Evaluation v5

The current `s05b-eval-v5` is honestly STALE and must remain so until run.

Add cases only if the product contract changes:

- explicit fixture-provenance-bound withdrawal;
- atomic exact-selection rejection;
- interrupted test lineage does not proliferate governing rules;
- withdrawn synthetic authority excluded while history retained.

If cases change, advance honestly to v6 and make v5 stale. Otherwise keep v5 exactly:

- 59 cases;
- hash `edf5ce4f8dd93d0b6d98c56adb0a9a3618708d54014fbfbf48da7fff66e0b4f3`.

After deployment and live authority recovery, CEO runs the current corpus once. Required result: current PASSED, failed 0, persisted count equals exact case count, zero-tolerance clear, releaseReady true. Do not restamp an old run.

## 10. Required tests

### Unit/integration

- queue pagination/filtering deterministic;
- detail projection does not load/expose unrelated authority;
- exact withdrawal preserves history;
- wrong ID/version/hash/cross-org/non-fixture batch rejected atomically;
- Auditor/Admin cannot withdraw/review;
- effective selector excludes withdrawn rows;
- S061 authority remains governing;
- repeated withdrawal replays safely;
- test-fixture recovery helper cannot touch non-fixture data;
- production-authorised mode forbids fixture actions;
- dossier last-known-good and three-person chain remain passing;
- client grant/session/revoke remain passing.

### Playwright

Create focused suites:

- `s05b-s062-authority-queue.spec.ts`
- `s05b-s062-live-publication.spec.ts`
- `s05b-s062-client-session.spec.ts`

Verify keyboard focus, useful loading/pending state, no 10-minute page churn, 360px/tablet/desktop/200% zoom, no horizontal overflow.

Set a performance expectation appropriate to the live fixture corpus: a focused authority decision should complete and return durable state within 30 seconds under normal Railway conditions. Record timings; do not hide a product timeout with a 10-minute Playwright allowance.

## 11. Gates and deployment

Run:

1. focused S062 tests;
2. S061 selector/retained-data tests;
3. S060 publication/client-access tests;
4. evaluation/readiness/mutation-sensitivity;
5. typecheck;
6. full shared-platform tests;
7. full Event OS tests;
8. programme validation;
9. Event OS build;
10. `git diff --check`;
11. focused local Playwright.

Record every first-run failure and correction.

Commit/push normally, prove parity, deploy Event OS only, verify exact SHA, alive/ready, POSTGRES, migrations APPLIED, `productionAuthorised:false`, providers inactive and S05A PASSED.

Then perform, in order:

1. governed withdrawal of exactly the four S060 fixture authorities;
2. event re-evaluation;
3. live Planner → Director → CEO publication;
4. live separate client grant/session/revoke;
5. live current evaluation corpus;
6. focused live Playwright.

If any fails, do not claim ready for Claude.

## 12. Prohibitions

- No deletion or timestamp rewriting.
- No invented legal review or extended review date.
- No wildcard/broad cleanup.
- No real data.
- No provider/communication/payment/booking/claim/dispatch/biometric action.
- No secret in prompt/log/report.
- No Control Tower deployment.
- No EOS-S05B acceptance.
- No EOS-S06 work.

## 13. Final report

Return:

- exact SHAs/commits/files;
- authority queue/repository design;
- fixture provenance/backfill receipt;
- exact four-row preview and withdrawal receipts;
- proof no other row changed;
- effective-authority snapshot before/after;
- dossier chain and last-known-good evidence;
- client session/revoke evidence;
- evaluation edition/hash/run/counts;
- focused/full gates and all first-run failures;
- live timings;
- GitHub/Railway parity;
- rollback/forward recovery;
- explicit READY FOR CLAUDE yes/no;
- confirmations: Claude not run, EOS-S05B not accepted, EOS-S06 not started, Control Tower not deployed, production unauthorised.

Stop for AI CTO review.

`EOS-S05B MD-PR-S062 GOVERNED SYNTHETIC-AUTHORITY RECOVERY AUTHORISED — WITHDRAW EXACT OBSOLETE FIXTURE AUTHORITIES, COMPLETE LIVE PUBLICATION AND CLIENT SESSION, RUN CURRENT CORPUS, REPORT AND STOP — NOT ACCEPTED — EOS-S06 NOT STARTED.`
