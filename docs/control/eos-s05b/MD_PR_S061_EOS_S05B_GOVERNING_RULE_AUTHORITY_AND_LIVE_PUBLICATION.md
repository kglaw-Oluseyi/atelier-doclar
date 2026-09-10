# MD-PR-S061 — EOS-S05B Governing Rule Authority and Live Publication Recovery

## 0. Authority and boundaries

This is the controlling implementation authority for one focused remediation after MD-PR-S060 V2. It addresses the live-only failure caused by incorrect rule/source authority selection and completes the live publication/client-access evidence.

Do not reopen or redesign S060’s accepted-in-review components: dossier permission separation, publication aggregate, client grant architecture, checkpoint projection, structured incidents/learnings, vendor labels, clause rendering, action lifecycle or evaluation v4 except where the rule-authority correction legitimately changes evaluation inputs.

EOS-S05B remains **NOT ACCEPTED**. Do not run Claude. Do not start EOS-S06.

## 1. Exact scope and baseline

- Repository: `kglaw-Oluseyi/atelier-doclar`
- Branch: `main`
- Required local/origin/GitHub baseline: `c526c666810029af3b635ec5c2e4122c79bef74d`
- Current live Event OS application SHA: `3968e96d5773081fca3ae35c22d40a9f2cc1f9f8`
- Railway: `atelier-doclar` / `production` / `event-os` only
- Control Tower must not be changed or deployed.

Verify exact baseline and clean/non-overlapping worktree. Stop on discrepancy.

## 2. Confirmed root cause

Current production code in `evaluateEventRiskOnSnap` selects:

```ts
const rules = snap.riskRuleEditions.filter(
  item => item.organisationId === input.organisationId
);
```

It therefore treats DISCOVERY, unapproved, superseded, withdrawn and historical rule editions as simultaneous governing authority. It also includes all of their IDs in the applicability hash.

Additionally, source/rule creation currently sets review timestamps to `now`, allowing newly created or approved material to become stale immediately after creation.

Clean-store tests concealed this retained-data defect. The live Alpha event correctly failed closed, but for the wrong authority set.

## 3. Governing authority model

### 3.1 Separate candidate history from effective authority

Create one canonical selector used everywhere:

```ts
type EffectiveRiskAuthority = {
  rule: RiskRuleEdition;
  sources: RiskSourceEdition[];
  authorityState:
    | "CURRENT_APPROVED"
    | "STALE_APPROVED"
    | "WITHDRAWN_NO_AUTHORITY"
    | "NO_APPROVED_EDITION";
  reasons: string[];
};

selectEffectiveRiskAuthorities(
  snap: PlatformSnapshot,
  organisationId: string,
  asOf: string,
): EffectiveRiskAuthority[];
```

The precise implementation must follow these rules:

1. Group rule editions by stable `ruleKey`.
2. DISCOVERY and COUNSEL_REVIEWED candidates are history/working editions; they do not govern applicability.
3. A newer unapproved draft must not hide the last valid approved edition.
4. Select at most one approved governing edition per `ruleKey`.
5. Prefer explicit current/supersession lineage if present.
6. Otherwise choose the newest APPROVED edition deterministically by edition/version/approvedAt/createdAt with ID only as final tie-breaker.
7. A later explicit WITHDRAWN decision for that lineage removes authority; do not silently fall back to an edition the withdrawal superseded.
8. `approvedHash` must equal `contentHash`; otherwise it is not current approved authority.
9. Every cited source must be in the same organisation and APPROVED with `approvedHash === contentHash`.
10. Source or rule review expiry makes the selected authority `STALE_APPROVED`; it does not cause unrelated historical drafts to enter the authority set.
11. Duplicate approved editions with ambiguous lineage must fail closed as an explicit authority conflict, not be silently combined.
12. The selector must be deterministic regardless of array/database row order.

Do not delete history. Do not mutate historical status merely to make the selector pass.

### 3.2 Applicability input

`evaluateEventRiskOnSnap` must use only the selector’s effective authority records.

Its content hash must include:

- selected governing rule edition IDs and content hashes;
- selected approved source IDs and hashes;
- current event fact edition identities;
- current applicable policy edition identities;
- authority-state/reason entries for stale/conflicted/no-authority rule keys.

It must not hash irrelevant DISCOVERY or superseded history as governing input.

### 3.3 Honest no-authority and stale outcomes


- no approved edition for a rule key: it is not a mandatory governing requirement merely because a draft exists;
- approved authority with expired review: `STALE`;
- approved rule with missing/unapproved/expired cited source: `STALE` or `INDETERMINATE` according to the ratified taxonomy;
- explicit withdrawal: no current authority, visibly explained;
- ambiguity/conflicting current approvals: fail closed and surface an authority-conflict decision, not duplicate requirements.

Do not convert unknowns or gaps into READY to make live publication pass.

## 4. Review-window correction

### 4.1 Operator input

Source and rule authoring/revision forms must collect or derive an explicit review schedule:

- `lastVerifiedAt` is set only by actual verification/approval;
- `nextReviewAt` must be later than `lastVerifiedAt`;
- the operator selects a review date or an approved catalogue policy supplies a documented interval;
- never default `nextReviewAt` to the same instant as creation/approval;
- unknown review date remains explicit and fail-closed; do not invent a statutory period.

Use human language: “Review again by”, not raw timestamp terminology.

### 4.2 Approval

On source/rule approval:

1. validate maker/checker;
2. bind exact content hash;
3. set `lastVerifiedAt = now`;
4. preserve the authorised future `nextReviewAt`;
5. reject `nextReviewAt <= now` with field-level validation;
6. never silently extend an existing expired authority.

### 4.3 Retained historic data

Do not bulk fabricate future review dates.

For retained records:

- preserve every historical timestamp;
- classify expired records honestly;
- allow an authorised reviewer to create/approve a successor or record a new review decision;
- expose the stale source/rule and exact next action in the UI;
- use a synthetic, explicitly authorised refresh for the Alpha fixture records needed by the live verification.

No broad cleanup and no destructive rewrite.

## 5. Dossier readiness semantics

Re-evaluate dossier gates using only the exact applicability snapshot captured in its `componentHashes`.

Requirements:

1. publish checks the captured snapshot, not whichever snapshot happens to be latest;
2. captured snapshot contains only effective governing authorities under §3;
3. a later draft rule does not stale an already approved snapshot;
4. an actually expired/withdrawn governing rule remains a blocker according to ratified policy;
5. gaps and accepted residual risks remain truthful in dossier content;
6. no bypass flag or test-only override may force READY;
7. last-known-good publication stays visible throughout remediation and any failed attempt.

## 6. Live Alpha recovery route

Implement a governed UI route for the authorised reviewer to resolve stale Alpha fixture authority:

- show each stale/conflicted effective rule and its cited sources;
- distinguish historic non-governing drafts from the selected governing edition;
- offer “Create review successor” / “Record current review” only to the Risk Governance Reviewer;
- require review reason, future next-review date and exact-hash confirmation;
- preserve maker/checker and immutable lineage;
- after correction, re-run event applicability explicitly;
- show exactly why readiness changed.

Do not edit timestamps directly and do not use a database script to manufacture approval.

## 7. Automated tests

### 7.1 Selector tests

Prove:

1. one approved + many DISCOVERY editions → approved alone governs;
2. newer DISCOVERY does not hide approved;
3. approved successor supersedes approved predecessor;
4. explicit withdrawal prevents fallback;
5. expired approved rule → one STALE authority, not all history;
6. unapproved source prevents its rule governing as current;
7. source successor/approval restores eligibility;
8. ambiguous competing approved editions fail closed;
9. array order changes do not change selection/hash;
10. cross-organisation editions never participate.

### 7.2 Retained-data regression fixture

Construct a fixture matching live Alpha history:

- historic approved edition;
- superseded/unapproved successors;
- expired source/rule;
- existing current publication;
- working dossier lineage.

Prove:

- irrelevant drafts do not govern;
- true stale authority is still visible;
- governed successor review produces a new applicability snapshot;
- old publication remains client-visible before and during correction;
- Planner → Director → CEO can publish a new dossier afterward;
- real client grant resolves the new publication;
- no history is deleted.

### 7.3 Persistence/concurrency

Run against normalized Postgres/repository logic:

- two reviewers cannot create competing current authority silently;
- stale review decision → `VERSION_CONFLICT`;
- failed review/application evaluation rolls back;
- replay returns same decision/snapshot without second success audit.

### 7.4 Evaluation corpus

If this changes v4 case inputs/contracts, create an honest `s05b-eval-v5`; otherwise add no vanity edition. At minimum the executable corpus must prove effective-authority selection with retained history and stale-review recovery. An earlier pass must become STALE if compatibility requires it. Never restamp.

## 8. Focused browser evidence

Create a focused Playwright suite:

1. seed/load retained-history fixture;
2. show non-governing DISCOVERY/superseded entries as history, not requirements;
3. show genuinely stale governing authority and its next action;
4. reviewer creates/approves a review successor with future review date;
5. re-evaluate and confirm exact effective rule/source IDs;
6. Planner assembles/submits;
7. Director approves exact hash;
8. CEO publishes successfully with no 503;
9. create a newer draft and prove client still sees last published dossier;
10. issue real client grant, establish separate client session, and view current publication;
11. revoke grant and prove denial;
12. refresh persistence;
13. verify keyboard/focus, 360 px, tablet, desktop and 200% zoom on the authority-review surface.

Run locally and live. For live, use uniquely labelled synthetic successors on the existing Alpha fixture. Do not delete or rewrite earlier Claude records.

## 9. Gates and deployment

Run in order:

1. focused authority-selector tests;
2. retained-data regression;
3. normalized persistence/concurrency tests;
4. evaluation/readiness/mutation-sensitivity tests;
5. `pnpm typecheck`;
6. full shared-platform tests;
7. full Event OS tests;
8. `pnpm programme:validate`;
9. Event OS build;
10. `git diff --check`;
11. focused local Playwright;
12. S060 publication/client-access changed-risk tests.

Record every first-run failure and correction.

Commit/push normally, prove parity, deploy Event OS only, verify exact SHA, alive/ready, POSTGRES, migrations APPLIED, production false and adapters inactive. Run the legitimately current CEO evaluation corpus if needed. Then complete the focused live Alpha publication and client-access journey.

Do not deploy Control Tower.

## 10. Required stop condition

Do not report “ready for Claude” unless all are true live:

- Alpha applicability uses only effective governing rule/source editions;
- stale authority was corrected through governed UI action, not direct data manipulation;
- Planner assemble/submit succeeded;
- Director exact-hash approve succeeded;
- CEO publish succeeded without 503;
- prior publication remained visible until replacement;
- separate client grant/session displayed the current published dossier;
- revoked grant was denied;
- readiness/evaluation gates are current.

If any fails, stop with exact evidence and do not pass the problem forward to Claude.

## 11. Prohibitions

- Synthetic data only.
- No destructive cleanup, timestamp rewrite, down-migration or absence DELETE.
- No real insurers/vendors/clients/policies.
- No communications, payments, bookings, claims, dispatch, OCR, scan or provider activation.
- No invented legal review interval or compliance certainty.
- No secrets in prompts/logs/screenshots/commits.
- Keep `productionAuthorised:false`.
- Do not run Claude.
- Do not accept EOS-S05B.
- Do not start EOS-S06.

## 12. Consolidated report

Return:

- starting/final/application/docs SHAs;
- changed files/commits;
- authoritative selector algorithm;
- review-window model;
- retained-data treatment;
- exact live Alpha stale records and governed successors;
- applicability before/after with exact effective IDs/hashes;
- dossier publication and last-known-good evidence;
- separate client grant/session/revocation evidence;
- corpus edition/hash/run if changed;
- all focused/full gates;
- every first-run failure;
- GitHub/Railway parity;
- rollback/forward recovery;
- explicit confirmations that Claude was not run, EOS-S05B not accepted, EOS-S06 not started, Control Tower not deployed and production remains unauthorised.

Stop for independent AI CTO review.

`EOS-S05B MD-PR-S061 GOVERNING RULE AUTHORITY AND LIVE PUBLICATION RECOVERY AUTHORISED — IMPLEMENT, VERIFY LIVE, DEPLOY EVENT OS ONLY, REPORT, THEN STOP — NOT ACCEPTED — EOS-S06 NOT STARTED.`
