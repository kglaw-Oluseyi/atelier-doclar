# MD-PR-S047 — EOS-S05A Budget Studio Override Execution Pack

**Status:** CEO-visible implementation authority  
**Slice:** EOS-S05A — Discovery, Investment & Executive Event Command  
**Scope:** Budget Studio scenario assumptions, calculation truth, durable navigation and contradiction-result focus  
**Required GitHub baseline:** `5c7d6356b5a618bc315f1b88cc76c844f7d659f1`  
**Current live Event OS application SHA:** `e63313de72018840075b853841da97d08ab13a42`  
**Repository:** `kglaw-Oluseyi/atelier-doclar`, branch `main`  
**Railway:** `atelier-doclar` / `production` / `event-os` only

---

## 1. Why this pack exists

MD-PR-S046 independently proved:

1. an approved/current Event Brief correctly prefills Budget Studio with 360 guests;
2. the field explains that a changed value becomes a scenario assumption and will not rewrite the brief;
3. changing the input to 350 and 340 did not reach the calculation engine;
4. successful-looking runs continued to calculate `CATERING_HEAD:guest.target_count = 360` and `BEVERAGE:guest.target_count = 360`;
5. other attempts produced a full-page `The requested record is not available` error with a Server Components render failure;
6. the Event Brief correctly remained 360;
7. contradiction resolution now chooses the correct identity-bound value, but keyboard focus returns to `<body>` after success.

The Budget Studio override path is a release-blocking false-success/data-flow defect. A displayed scenario value cannot be ignored by the engine. A calculation cannot report success while using different inputs. A newly created result cannot redirect to a record that is unavailable.

This prompt specifies the implementation boundary literally. Do not substitute a cosmetic field fix, client-side-only state or another test that merely checks the input element.

## 2. Required outcome

After this work:

- the current approved brief remains governing truth at 360;
- Budget Studio initially displays 360 as `From current Event Brief`;
- an operator may explicitly create a scenario assumption of 350;
- the server receives, validates and persists that assumption;
- the calculation engine consumes 350 for every rule driven by `guest.target_count`;
- the calculation trace proves the effective value, governing source and override lineage;
- the Event Brief remains unchanged at 360;
- a refresh/reopen reproduces the same scenario and result;
- an identical retry is deterministic and idempotent;
- stale, invalid or cross-event inputs fail honestly without a success receipt;
- the post-calculation route always resolves the durable record it names;
- resolving a contradiction returns keyboard focus to the result region.

## 3. Pre-flight and diagnostic rule

Before editing:

1. Verify local HEAD, `origin/main` and GitHub `main` all equal `5c7d6356b5a618bc315f1b88cc76c844f7d659f1`.
2. Verify the worktree is clean except this authority document if George has placed it at repository root.
3. Read this pack completely.
4. Trace the actual Budget Studio path from:
   - rendered guest-count input;
   - HTML form name/value;
   - server action/FormData parser;
   - action command schema;
   - service boundary;
   - governing brief adapter;
   - scenario assumption model;
   - calculation-input snapshot;
   - rules/BOM evaluation;
   - trace/result persistence;
   - action result and redirect;
   - page loader/projection after redirect.
5. Record the exact point at which 350/340 is discarded or replaced by 360.
6. Reproduce the `requested record is not available` path locally and identify the actual missing identifier/table/scope/version. Do not guess that it is merely a Next.js problem.
7. Add a failing test at each proven break before changing production behaviour.

Do not broadly inspect accepted slices. Do not reset or discard unrelated work.

## 4. Canonical concepts — do not conflate them

These are separate values:

```ts
type GoverningBriefGuestCount = {
  value: number;
  assertionId: AssertionId;
  briefEditionId: BriefEditionId;
  briefContentHash: string;
};

type ScenarioGuestCountAssumption = {
  value: number;
  source: "SCENARIO_OVERRIDE";
  governingValue: number;
  governingAssertionId: AssertionId;
  reason: string;
};

type EffectiveBudgetDriver = {
  code: "guest.target_count";
  value: number;
  provenance:
    | { kind: "CURRENT_BRIEF"; briefEditionId: BriefEditionId; assertionId: AssertionId }
    | {
        kind: "SCENARIO_OVERRIDE";
        assumptionId: BudgetAssumptionId;
        governingBriefEditionId: BriefEditionId;
        governingAssertionId: AssertionId;
        governingValue: number;
      };
};
```

Adapt branded identifiers and names to the repository. Preserve these semantics.

- The Event Brief is governing source truth.
- A Budget scenario assumption is an immutable planning alternative.
- The effective calculation driver is derived for one scenario/calculation.
- The calculation result and trace must bind the exact effective driver snapshot.
- A scenario override never writes back to the Event Brief, RSVP, forecast, invitation, attendance, programme, venue or payment products.

## 5. Step 1 — make the browser form unambiguous

Locate the Budget Studio guest-count input. It must submit a stable explicit name, for example:

```tsx
<input
  id="budget-guest-count"
  name="guestCountOverride"
  type="number"
  inputMode="numeric"
  min={0}
  step={1}
  defaultValue={currentScenarioOverride ?? governingGuestCount ?? ""}
  aria-describedby="budget-guest-count-source budget-guest-count-help"
/>
```

Use controlled state only if the existing form architecture requires it. In either case, ensure the value visible immediately before submit is the value serialized into FormData.

Requirements:

- `360` prefilled from the current eligible brief is visually and semantically distinguished from a scenario override;
- editing it marks the field `Scenario assumption — differs from current Event Brief (360)` before calculation;
- require a short reason when the submitted value differs from governing truth;
- do not treat the HTML placeholder as a value;
- do not use hidden governing-value inputs as the submitted override;
- do not allow a duplicate input name to cause `FormData.get()` to read the wrong value;
- do not reset the edited value during pending submission;
- disable repeat submit only while the current action is pending;
- provide `aria-live`/status copy without moving the user to the page top.

Add a development/test assertion proving FormData contains the typed number before the action is invoked. Do not log client or secret data.

## 6. Step 2 — parse and validate one explicit server command

Do not pass raw `FormData` beyond the action boundary.

Create or adapt a strict schema equivalent to:

```ts
const CalculateBudgetScenarioCommandSchema = z.object({
  organisationId: OrganisationIdSchema,
  eventId: EventIdSchema,
  engagementId: DiscoveryEngagementIdSchema.optional(),
  baseScenarioId: BudgetScenarioIdSchema.optional(),
  governingBriefEditionId: BriefEditionIdSchema,
  governingBriefContentHash: ContentHashSchema,
  expectedScenarioVersion: z.coerce.number().int().nonnegative().optional(),
  guestCountOverride: z.coerce.number().int().min(1).max(MAX_GUEST_COUNT).optional(),
  guestCountOverrideReason: z.string().trim().min(8).max(500).optional(),
  idempotencyKey: IdempotencyKeySchema,
});
```

Rules:

- empty override input means `undefined`, not `0`, `NaN` or the governing value copied silently;
- if override equals governing value, either omit the override or record it explicitly as `NO_VARIANCE`; do not mislabel it;
- if override differs, require a reason;
- reject decimals, negatives, overflow and locale-corrupted values honestly;
- validate organisation/event/engagement lineage server-side;
- validate the brief edition is still the current eligible edition and its hash matches;
- validate authorisation at the service boundary;
- reject mass-assigned fields not in the schema;
- do not trust hidden fields for governing data—reload canonical brief truth inside the transaction/service operation.

The server action must pass the parsed override into the service. Add a focused test that spies on or observes the service command and proves typed 350 arrives as numeric 350.

## 7. Step 3 — construct the immutable scenario assumption

Inside the service transaction/operation:

1. Load the current eligible Event Brief and its guest-count assertion.
2. Confirm it is still the edition/hash named by the command.
3. Derive `governingGuestCount = 360` from the canonical adapter.
4. If `guestCountOverride` is absent, use the governing value with `CURRENT_BRIEF` provenance.
5. If it is 350, create an immutable typed scenario assumption:

```ts
{
  driverCode: "guest.target_count",
  value: 350,
  unit: "PERSON",
  source: "SCENARIO_OVERRIDE",
  governingValue: 360,
  governingBriefEditionId,
  governingAssertionId,
  reason,
  createdByPersonId,
  createdAt,
}
```

6. Bind the assumption to the exact scenario edition/calculation request.
7. Never update the governing assertion or brief edition.

If scenario editions are immutable, create a new scenario edition when assumptions change. Do not mutate the previous calculated scenario in place. Record lineage such as `supersedesScenarioEditionId` or the repository's canonical equivalent.

Hashing must include every governing semantic assumption, including guest count and its source classification/reason where required. Identical inputs must yield the same semantic hash; 360 and 350 must not share a calculation hash.

## 8. Step 4 — define override precedence once

Create one pure server-side function used by the calculation engine:

```ts
function resolveEffectiveBudgetDrivers(input: {
  governingDrivers: readonly BudgetDriver[];
  scenarioAssumptions: readonly BudgetScenarioAssumption[];
}): readonly EffectiveBudgetDriver[];
```

Precedence:

1. start from the immutable governing driver snapshot;
2. validate each scenario assumption against an allowed overridable driver definition;
3. replace the effective value for that scenario only;
4. retain both governing and override provenance in the effective driver;
5. reject two active overrides for the same driver unless the domain explicitly versions/supersedes them;
6. reject an override of a protected/non-overridable driver;
7. never re-read the brief guest count later and overwrite the resolved effective value.

The BOM/rules engine must receive only the resolved `EffectiveBudgetDriver[]` or an exact immutable calculation snapshot derived from it. Search for every later use of `guest.target_count`, `guestCount`, brief facts or coverage facts in the calculation path. Remove any second lookup that replaces the scenario value with 360.

## 9. Step 5 — make every dependent rule consume 350

For the 350 scenario, every quantity/rule whose declared driver is `guest.target_count` must consume 350.

At minimum prove:

- `CATERING_HEAD:guest.target_count = 350`;
- `BEVERAGE:guest.target_count = 350`;
- any staffing, seating-support, gifts or per-person items configured to use the same driver also consume 350;
- fixed-price/non-guest-driven lines remain unchanged;
- tier/minimum/increment rules apply after the effective value is resolved, not before;
- contingency and tax bases use the recalculated eligible totals;
- marginal/delta values are calculated against the correct comparison scenario.

Do not hard-code catering and beverage adjustments. The general driver resolution must make all declared dependants correct.

## 10. Step 6 — persist a complete calculation snapshot and trace

Persist atomically:

- scenario edition/identity;
- base/governing brief edition and content hash;
- governing driver snapshot;
- scenario assumptions;
- effective driver snapshot;
- taxonomy/template/price-card/rule/FX editions;
- BOM lines;
- calculation trace;
- totals and currency;
- calculation semantic hash;
- actor, time, correlation and idempotency receipt.

The trace for an overridden driver must say, in substance:

```text
guest.target_count
Governing Event Brief value: 360
Scenario assumption: 350
Effective calculation value: 350
Reason: [synthetic planning reason]
Event Brief was not changed.
```

Every affected line trace must reference the effective driver value 350 and the assumption identity. Do not render 350 in a summary while line-level traces still use 360.

Persist before returning success. Storage failure must not leave a completed-looking calculation or success receipt.

## 11. Step 7 — fix the missing-record redirect

Trace the exact full-page error. Verify all of the following:

1. The action returns the actual persisted `scenarioEditionId` and `calculationResultId`, not the base scenario ID, brief ID, calculation hash or stale form ID in the wrong route parameter.
2. The redirect/query string uses the same identifier type expected by the destination loader.
3. Organisation/event scope used by the loader matches the persisted row.
4. The transaction has committed before redirect/read.
5. The page does not ask for a prior immutable scenario edition after creating a successor.
6. A replay returns the existing durable target identifier.
7. The loader does not select “latest” by timestamp when the action has an exact result ID.
8. Errors distinguish `NOT_FOUND`, `SCOPE_MISMATCH`, `VERSION_CONFLICT` and dependency failure without leaking protected data.

Use a typed action result:

```ts
type CalculateBudgetScenarioActionResult = {
  status: "CALCULATED" | "REPLAYED";
  scenarioEditionId: BudgetScenarioEditionId;
  calculationResultId: BudgetCalculationResultId;
  calculationHash: string;
  correlationId: string;
};
```

The UI must not show success unless these identifiers resolve through the normal server projection. After redirect, refresh and direct reopen must load the same result.

Do not paper over the error with retry loops or catch-all redirects to the base Budget page.

## 12. Step 8 — concurrency and idempotency

For identical current inputs and idempotency key:

- one durable calculation result;
- one scenario edition where semantics are identical;
- replay returns the same identifiers;
- no duplicate audit success;
- same totals and trace hash.

For changed guest count 350→340:

- create a new immutable scenario edition/calculation or canonical successor;
- distinct semantic/calculation hash;
- 340 becomes the effective driver;
- prior 350 result remains addressable and immutable;
- neither changes the brief's 360.

For stale brief hash/scenario version:

- reject with truthful conflict;
- do not calculate from mixed old/new inputs;
- do not show success;
- preserve user-entered override/reason where safely possible so it can be reviewed and retried.

## 13. Step 9 — frontend state and human clarity

After a successful override calculation, Budget Studio must show:

- `Scenario assumption: 350 guests`;
- `Current Event Brief: 360 guests`;
- variance: `−10 guests`;
- reason;
- which cost lines/totals changed;
- effective calculation value 350 in trace;
- a clear statement that the Event Brief remains unchanged;
- link back to the governing brief;
- scenario edition/result status and generated time;
- identifiers/hashes secondary.

If the calculation fails:

- keep the typed value and reason visible;
- show an action-scoped error adjacent to Calculate;
- do not replace the whole page with a generic record-unavailable state when the base Budget workspace remains accessible;
- focus the error summary;
- state whether retry is safe;
- never display stale 360 results as though they represent the failed 350 request.

Pending, success, replay, stale and failure states must be distinct.

## 14. Step 10 — contradiction-result focus

Fix the minor accessibility regression proven by Claude.

The resolved contradiction panel must have a stable heading/ref and programmatic focus target, for example:

```tsx
<section aria-labelledby="resolved-contradiction-heading">
  <h3 id="resolved-contradiction-heading" tabIndex={-1} ref={resultHeadingRef}>
    Contradiction resolved
  </h3>
  ...
</section>
```

After successful resolution/redirect:

- focus the result heading, not `<body>`;
- ensure focus is visible and not hidden behind sticky navigation;
- announce the governing and superseded values once without chatter;
- preserve normal focus when merely refreshing an already resolved page;
- do not auto-focus based on an untrusted arbitrary query selector;
- error focuses the action error, not the success result.

Use the application's established server-action/redirect focus pattern rather than adding a parallel framework.

## 15. Required unit and property tests

Add a focused suite proving:

### Command/input

- FormData 350 parses to numeric override 350;
- empty means no override;
- override different from 360 requires reason;
- invalid/negative/decimal/overflow rejected;
- hidden/mass-assigned governing value ignored and canonical truth reloaded;
- wrong event/organisation/brief hash denied.

### Driver resolution

- governing 360 + no override → effective 360/CURRENT_BRIEF;
- governing 360 + override 350 → effective 350/SCENARIO_OVERRIDE;
- governing 360 + override 340 → effective 340;
- all guest-driven lines use the effective value;
- non-guest lines unchanged;
- duplicate active override rejected or canonically superseded;
- brief remains byte/hash identical;
- 360/350/340 calculation hashes differ appropriately;
- identical 350 replay is deterministic.

### Persistence/navigation

- result persisted before success;
- returned IDs load from normal projection;
- redirect uses calculation result ID expected by loader;
- refresh/reopen works;
- idempotent replay returns the same ID;
- 350→340 creates an immutable successor;
- storage failure produces no completed/success result;
- scoped not-found cannot leak another event.

### Trace

- governing=360, override=350, effective=350 all present;
- catering and beverage line traces use 350;
- no affected trace uses 360 as effective value;
- override reason/source retained;
- client/auditor projections do not expose internal margin or restricted evidence.

### Focus

- successful contradiction resolution marks the result focus target;
- client hydration/redirect focuses it once;
- error focuses error summary;
- ordinary refresh does not steal focus.

Use property tests where the engine already uses them. Include representative values around tier/minimum/increment boundaries so the override cannot pass by coincidence.

## 16. Required focused Playwright

Create or extend a dedicated MD-PR-S047 spec with these journeys.

### Journey 1 — 360 to 350

1. Use a fresh synthetic event with an independently approved/current brief at 360.
2. Open Budget Studio and assert 360 + `From current Event Brief`.
3. Type 350 using real keyboard input.
4. Enter a synthetic override reason.
5. Immediately before submit, assert the input value is 350.
6. Calculate once.
7. Assert no full-page error.
8. Assert scenario assumption=350, governing brief=360, effective driver=350.
9. Assert catering and beverage traces use 350.
10. Assert at least one genuinely guest-driven quantity/amount changes consistently with the rule; do not merely check text.
11. Assert Event Brief remains 360.
12. Refresh and direct-reopen the returned result ID; assert identical values/hash.

### Journey 2 — idempotent 350 replay

1. Submit the identical semantic request/idempotency path again as supported.
2. Assert replay/one durable result and same IDs/hash.
3. Assert no duplicate scenario/result/audit creation.

### Journey 3 — 350 to 340 successor

1. Change the scenario assumption to 340 using real keyboard input.
2. Calculate.
3. Assert effective driver and all affected traces use 340.
4. Assert a new immutable result/successor with distinct hash.
5. Reopen the prior 350 result and confirm it still uses 350.
6. Confirm the brief remains 360.

### Journey 4 — honest failure

Using controlled fixture/service failure—not Railway configuration:

1. produce a stale version or storage failure;
2. assert no success receipt;
3. assert typed override/reason remain recoverable;
4. assert action-scoped error and retry classification;
5. assert no completed result exists.

### Journey 5 — focus

Resolve a fresh 320/360 contradiction using keyboard.

- after success, active element is the resolved-result heading/panel;
- focus is visibly within viewport;
- refresh does not unexpectedly steal focus.

Run at desktop and 360px for Budget override and focus journeys. Check 200% zoom through the established automated method if the local browser environment supports it. No document-level horizontal scroll.

## 17. Evaluation corpus

Add executable regression cases for:

- current brief 360 + scenario override 350 → effective driver 350;
- all declared guest-driven lines consume the override;
- Event Brief remains 360;
- calculation result is durably retrievable by returned ID;
- failure cannot show success or stale 360 output;
- 350→340 creates distinct immutable calculation semantics.

These must execute production domain functions and observe persisted state/trace. Do not use test-authored pass booleans.

If the corpus changes, issue the next edition/hash. The current `s05a-eval-v4` pass becomes `STALE` until the new corpus runs. Do not restamp or edit the old run.

## 18. Gates

Run and report:

1. focused Budget Studio/MD-PR-S047 tests;
2. Budget rules/property/determinism tests;
3. evaluation/readiness/mutation-sensitivity tests;
4. `pnpm typecheck`;
5. `pnpm --filter @maison-doclar/shared-platform test`;
6. `pnpm --filter @maison-doclar/event-os test`;
7. `pnpm programme:validate`;
8. `pnpm --filter @maison-doclar/event-os build`;
9. `git diff --check`;
10. focused MD-PR-S047 Playwright locally;
11. only changed-risk S05A regression specs.

Report every first-run failure, exact root cause, correction and complete relevant rerun. A later pass does not erase the first failure.

## 19. Commit, deploy and live verification

Suggested commit boundaries:

1. scenario override command/effective-driver/persistence;
2. Event OS action/result/navigation and focus;
3. evaluation/tests/control evidence.

Push normally. No amend, force-push or history rewrite. Verify local HEAD = origin/main = GitHub main.

Deploy Event OS only to `atelier-doclar/production/event-os`. Do not deploy Control Tower.

Verify:

- exact application SHA;
- alive/ready;
- POSTGRES and migrations APPLIED;
- `productionAuthorised:false`;
- layout asset/export READY;
- evaluation is fail-closed after corpus change;
- run the complete current fixture corpus as CEO;
- all cases pass before release-ready becomes true;
- focused live Playwright passes;
- live 360→350 and 350→340 results persist after refresh/reopen;
- no external provider, communication, payment, booking, biometric or real data.

Documentation-only final stamps do not require another Event OS deployment.

## 20. Control records and final report

Update only established EOS-S05A control records required by validation. Do not create ceremony-only files. Do not accept EOS-S05A or increment catalogue count.

Return one consolidated report containing:

1. starting/final/application/live SHAs;
2. commits/files;
3. exact root causes of ignored override and missing-record navigation;
4. form/action command contract;
5. immutable scenario assumption and driver precedence;
6. persistence and redirect identifiers;
7. 360→350 and 350→340 traces and calculated differences;
8. proof Event Brief stayed 360;
9. idempotency/concurrency/failure evidence;
10. focus correction evidence;
11. evaluation corpus edition/hash/count and readiness transition;
12. focused/full gates;
13. every first-run failure;
14. GitHub parity;
15. Railway deployment/readiness/live Playwright;
16. remaining debt and rollback/forward recovery;
17. explicit confirmation Claude was not run, EOS-S05A not accepted, EOS-S06 not started, Control Tower not deployed and production unauthorised.

Stop for AI CTO review. Do not instruct Claude yourself.

End exactly:

`EOS-S05A MD-PR-S047 BUDGET STUDIO OVERRIDE EXECUTION COMPLETE — READY FOR AI CTO REVIEW AND FINAL FOCUSED CLAUDE VERIFICATION — NOT ACCEPTED — EOS-S06 NOT STARTED.`

