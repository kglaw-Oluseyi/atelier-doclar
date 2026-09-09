# MD-PR-S045 — EOS-S05A Final Truthful Decision Remediation

**Status:** CEO-visible implementation authority  
**Slice:** EOS-S05A — Discovery, Investment & Executive Event Command  
**Required repository baseline:** GitHub `main` at `a795947bd2c3bd2ff16cccaa1fbe26fd5cd6d77d`  
**Current Event OS application deployment:** `6e2cfd8e1eb4242256fa1784a5c78a92087f4422`  
**Repository:** `kglaw-Oluseyi/atelier-doclar`, branch `main`  
**Railway:** `atelier-doclar` / `production` / `event-os` only

## 1. Purpose and scope

Remediate the two genuine defects established by MD-PR-S044:

1. an idempotent extraction replay does not create a duplicate assertion, but the action receipt falsely reports `1 proposed, 0 duplicate` as though new work occurred;
2. the contradiction option `Supersede earlier value` caused the earlier 320 value to govern and the later 360 value to be superseded—the opposite of the choice a reasonable operator expected.

Also clarify and prove the Budget Studio guest-count prerequisite without weakening governance. MD-PR-S044 attempted Budget prefill while the brief was only working/submitted and could not be approved by its maker. A staff-reviewed assertion is not automatically an approved/current Event Brief. Budget Studio must source a governing guest count only from the canonical eligible brief state established by EOS-S05A.

Do not reopen or rebuild:

- confidential-evidence disclosure;
- dimension-specific client consent;
- client-session isolation;
- general Budget Engine calculation;
- roadmap or change intelligence;
- Executive Event Command;
- the complete evaluation architecture;
- accepted EOS-S01–S05 behaviour.

EOS-S05A remains unaccepted. Do not start EOS-S06.

## 2. Pre-flight

1. Verify local HEAD, `origin/main` and GitHub `main` equal `a795947bd2c3bd2ff16cccaa1fbe26fd5cd6d77d`.
2. Treat the difference between GitHub main and live Event OS as documentation-only at the starting point; do not call it deployment drift.
3. Verify a clean worktree except this authority file if newly placed at repository root.
4. Read the current extraction dispositions/idempotency receipts, contradiction-resolution command/service/UI, Event Brief publication semantics, Budget Studio source adapter and focused tests.
5. Stop if there is overlapping work or a materially different baseline. Do not reset or discard user work.

## 3. Defect A — truthful idempotent extraction receipts

### 3.1 Required semantic distinction

The immutable historical disposition for the original extraction may remain `ASSERTION_PROPOSED`. A replay must not rewrite that history merely to change the wording.

The action result returned for the current invocation must distinguish:

- a newly created candidate assertion;
- an existing candidate already linked to the same source/version;
- a durable idempotency receipt replay;
- a source considered with no material assertion;
- a source needing human review;
- a rejected/unsupported source;
- a failed extraction.

Do not calculate the current receipt by blindly replaying counters stored for the original successful invocation.

Use or adapt an explicit invocation result similar to:

```ts
type ExtractionInvocationResult = {
  invocationId: string;
  extractionRunId: string;
  replayed: boolean;
  sourceVersion: number;
  consideredCount: number;
  newlyProposedCount: number;
  existingLinkedCount: number;
  noMaterialAssertionCount: number;
  needsHumanReviewCount: number;
  rejectedCount: number;
  failedCount: number;
  dispositions: ExtractionInvocationDisposition[];
};
```

Adapt identifiers to canonical schemas. Do not introduce `any`, `unknown` payloads or UI-derived truth.

For the first supported extraction of a source:

```text
Considered 1: 1 new proposal, 0 existing, 0 unmatched, 0 need review, 0 rejected.
```

For a retry against the identical source identity/version and extraction contract:

```text
No new proposals — the existing proposal is already linked to this source.
Considered 1: 0 new proposals, 1 existing, 0 unmatched, 0 need review, 0 rejected.
```

Exact copy may be refined to Command Atelier language, but it must state the same truth. Do not call an existing proposal newly proposed.

### 3.2 Durable idempotency

The command boundary must identify replay using its canonical idempotency key/receipt and source version. Requirements:

- identical retry creates no assertion, disposition, audit event or extraction-result duplicate;
- the new invocation response truthfully describes replay/existing linkage;
- concurrent duplicate submissions converge on one durable result;
- a changed source version is new work and must not be classified as replay;
- a changed extractor/corpus contract follows existing compatibility policy rather than silently reusing incompatible output;
- stale expected version returns an honest conflict;
- audit correlates the retry without claiming a second creation;
- refresh shows one assertion and one source lineage.

Do not alter the original assertion's created time, source link or immutable extraction evidence.

### 3.3 UI receipt

Render separate labels for `New proposals` and `Existing linked proposals`. If the action is a replay, say so in human language and keep the correlation identifier secondary.

No green generic `Succeeded` heading may contradict the detailed outcome. A technical success with zero new proposals is acceptable only when the receipt clearly says no new proposal was created.

## 4. Defect B — contradiction resolution must select an explicit governing assertion

### 4.1 Remove relative ambiguity

Do not expose consequential options whose meaning depends on how the reader interprets `earlier`, `later`, `supersede`, or the internal ordering of records.

Replace choices such as:

- `Supersede earlier value`;
- `Supersede later value`;
- `Keep first`;
- `Keep latest`;

with explicit candidate choices identifying the value and source, for example:

```text
Use approximately 320 guests as the governing planning value
Source: Principal A · “Current planning assumption is 320 guests.”

Use approximately 360 guests as the governing planning value
Source: Principal B · “The other principal expects closer to 360 people.”

Keep unresolved and seek clarification
```

Where safe and available, include speaker label and source time. Do not reveal restricted evidence to an unauthorised resolver.

### 4.2 Command contract

The server command must bind the decision to stable identities, not relative position:

```ts
type ResolveAssertionContradictionCommand = {
  organisationId: OrganisationId;
  engagementId: DiscoveryEngagementId;
  contradictionId: ContradictionId;
  expectedVersion: number;
  resolution:
    | {
        kind: "SELECT_GOVERNING_ASSERTION";
        governingAssertionId: AssertionId;
        supersededAssertionIds: AssertionId[];
        reason: string;
      }
    | {
        kind: "KEEP_UNRESOLVED";
        reason?: string;
      };
  idempotencyKey: string;
};
```

Adapt names to existing branded types. The server must validate:

- every selected/superseded assertion belongs to this exact contradiction, engagement and organisation;
- the governing assertion is not also superseded;
- the decision covers the competing candidates required by the resolution;
- actor has the appropriate scoped decision permission;
- expected version/current contradiction hash matches;
- reason is required when governing truth changes;
- the decision cannot manufacture a candidate value;
- client or AI proposal authority cannot perform the governing decision;
- maker/checker or other existing decision separation remains enforced where applicable;
- idempotent replay cannot invert or duplicate the resolution;
- stale tabs cannot decide an old candidate set.

If the existing persisted command uses a relative enum, add a compatible v2 command/schema or migrate only unresolved working records safely. Do not rewrite existing historical decisions. Preserve their recorded semantics and audit lineage.

### 4.3 Confirmation and result

Before submit, show a concise confirmation:

```text
You are selecting approximately 360 guests as the governing planning value.
Approximately 320 guests will remain in the evidence history as superseded.
```

The button should say `Confirm 360 as governing value`, or an equivalently explicit label derived from the selected candidate.

After success, show:

- exact governing value/source;
- superseded value/source;
- decision maker and time using permission-safe human labels;
- reason;
- correlation/hash secondary;
- statement that sources were preserved.

Focus the result and keep it near the contradiction. Refresh/reopen must show the same result.

### 4.4 Accessibility

Candidate radio/select accessible names must contain the value and safe source label. Do not rely on colour, visual order, `earlier/later` language or an unannounced preview. Keyboard users must be able to review both candidates, select, confirm and reach the result.

At 360px and 200% zoom, each candidate becomes a readable labelled region without document-level horizontal scroll.

## 5. Budget Studio — preserve the governing gate and make it intelligible

### 5.1 Governing rule

Do not prefill Budget Studio from a mere candidate assertion or `STAFF_REVIEWED` fact when it is not part of the eligible approved/current Event Brief state.

Use the existing ratified brief authority. The adapter should return an explicit source state such as:

```ts
type BudgetGuestCountSource =
  | {
      kind: "CURRENT_BRIEF";
      value: number;
      briefEditionId: BriefEditionId;
      briefContentHash: string;
      assertionId: AssertionId;
      confirmedAt: string;
    }
  | {
      kind: "BRIEF_NOT_CURRENT";
      latestBriefState: "WORKING" | "SUBMITTED" | "APPROVED_UNPUBLISHED";
    }
  | { kind: "UNRESOLVED_CONTRADICTION" }
  | { kind: "UNKNOWN" }
  | { kind: "NOT_APPLICABLE" };
```

Adapt the exact eligible state if the canonical system intentionally permits approved-unpublished editions; document and test it. Never quietly broaden the rule to make the browser test green.

### 5.2 UI states

When no governing/current brief exists, replace ambiguous copy such as `No confirmed guest count is available` with the precise reason:

- `A guest count is recorded, but the Event Brief is still awaiting approval/publication. Budget Studio will not treat it as governing yet.`
- `The guest-count contradiction must be resolved before Budget Studio can use it.`
- `The current Event Brief records the guest count as unknown.`

Offer a link to the exact next authoritative action where permitted. Do not offer the maker a self-approval route.

When an eligible current brief exists:

- prefill the exact value;
- show source brief edition/hash and assertion in a secondary provenance disclosure;
- label it `From current Event Brief`;
- changing it creates a clearly labelled scenario assumption and does not mutate the brief;
- recalculation trace records the override and governing source.

Do not insert the old arbitrary `180` default.

## 6. Required tests

### 6.1 Extraction

- first extraction: one new proposal;
- identical retry: zero new, one existing/replayed;
- response and UI copy distinguish them;
- assertion/source/disposition counts remain stable after retry;
- concurrent identical requests converge;
- changed source version is processed as new work;
- stale source version conflicts;
- audit does not claim duplicate creation;
- mutation test fails if replay is reported as newly proposed.

### 6.2 Contradiction

- select 320 by assertion ID: 320 governs;
- select 360 by assertion ID: 360 governs;
- DOM order reversed: selected ID still governs;
- timestamps equal: selected ID still governs;
- stale candidate set rejected;
- foreign/cross-engagement assertion ID denied;
- governing ID cannot appear in superseded IDs;
- reason and provenance persist;
- both original sources remain immutable;
- idempotent replay gives one decision;
- unauthorised role/direct action denied;
- keyboard and accessible-name assertions;
- mobile/zoom no overflow.

### 6.3 Budget source

- candidate-only fact does not prefill;
- staff-reviewed fact in WORKING brief does not prefill if not canonically eligible;
- SUBMITTED but undecided brief shows precise awaiting-decision state;
- unresolved contradiction does not prefill;
- current eligible brief prefills exact 360 and provenance;
- superseded brief does not govern;
- changing prefill creates a scenario assumption only;
- unknown has no arbitrary default;
- cross-event/current-edition mismatch denied;
- maker cannot self-approve merely to unlock Budget Studio.

## 7. Focused Playwright

Add one focused spec for MD-PR-S045.

### Journey 1 — extraction replay

1. Create a fresh synthetic engagement/note using the supported 320 phrase.
2. Grant required synthetic AI-analysis consent.
3. Extract once and assert `1 new proposal`.
4. Extract the unchanged source again.
5. Assert `0 new proposals`, `1 existing` or equivalent truthful replay wording.
6. Refresh and prove one assertion/source lineage.

### Journey 2 — explicit contradiction choice

1. Create/extract 320 and 360 candidates from distinct synthetic principals.
2. Confirm contradiction is open.
3. Choose the option explicitly labelled with 360 and its safe source.
4. Confirm the pre-submit statement says 360 will govern and 320 will remain superseded evidence.
5. Submit.
6. Assert 360 is governing and 320 superseded.
7. Refresh/reopen and assert persistence.
8. Repeat with DOM/candidate creation order reversed in a test fixture and prove identity—not order—governs.

### Journey 3 — Budget prerequisite

1. With the resolved 360 fact in a working/submitted brief, assert Budget Studio explains that the brief is not yet governing and does not prefill.
2. Use a different authorised checker to approve and, where required, publish the exact brief.
3. Reopen Budget Studio and assert 360 is prefilled from the exact current brief.
4. Change it to a synthetic scenario assumption and confirm the brief remains 360.
5. Confirm no arbitrary default in an unknown fixture.

Run locally and live. Use synthetic records only.

## 8. Evaluation corpus

Add regression coverage to the executable corpus only where MD-PR-S045 changes a release invariant:

- idempotent extraction invocation truth;
- explicit identity-bound contradiction selection;
- Budget adapter refuses non-governing brief state and accepts the current eligible brief.

If executable corpus semantics change, issue a new edition/hash. The existing `s05a-eval-v3` pass must become `STALE` until the new corpus executes. Never edit or restamp the prior run.

Run the current complete corpus locally and live after deployment. Persist all case results and verify fail-closed readiness before the new pass.

## 9. Gates, commit and deployment

Run:

- focused MD-PR-S045 tests;
- evaluation/readiness/mutation tests;
- `pnpm typecheck`;
- `pnpm --filter @maison-doclar/shared-platform test`;
- `pnpm --filter @maison-doclar/event-os test`;
- `pnpm programme:validate`;
- `pnpm --filter @maison-doclar/event-os build`;
- `git diff --check`;
- focused Playwright locally;
- changed-risk S05A regression specs only.

Report every first-run failure, root cause, correction and full relevant rerun.

Commit by meaningful boundary, push normally and verify local HEAD = origin/main = GitHub main. Deploy Event OS only. Do not deploy Control Tower.

Verify live SHA, alive/ready, POSTGRES, migrations APPLIED, `productionAuthorised:false`, layout stores READY, and S05A evaluation fail-closed transition then current-corpus PASS. Run focused live Playwright and representative refresh persistence.

## 10. Control records and final report

Update existing EOS-S05A control records proportionally under MD-PR-S045. Record that:

- Auditor masking/client isolation/accessibility limitations in MD-PR-S044 were sufficiently covered by independent automated/live evidence and were not reopened;
- staff-reviewed-but-unpublished is not governing Budget truth;
- EOS-S05A remains unaccepted;
- catalogue accepted-slice count remains 5;
- EOS-S06 remains unstarted/unauthorised.

Return one consolidated report with SHAs, commits, exact contract changes, test evidence, first-run failures, GitHub parity, Event OS deployment/readiness, live corpus result, live journeys, remaining debt and rollback/forward recovery.

Do not run Claude or self-accept EOS-S05A.

End exactly:

`EOS-S05A MD-PR-S045 FINAL TRUTHFUL-DECISION REMEDIATION COMPLETE — READY FOR AI CTO REVIEW AND NARROW CLAUDE REVERIFICATION — NOT ACCEPTED — EOS-S06 NOT STARTED.`

