# MD-PR-S067 — EOS-S05B Durable Authority Withdrawal and Review Completion

## 0. Authority and posture

This is the sole implementation authority for MD-PR-S067.

Repository: `kglaw-Oluseyi/atelier-doclar`  
Branch: `main`  
Required starting GitHub/local/origin SHA: `35e677943ae7147cb5fb399f045f26bc2570b40a`  
Expected live Event OS application SHA before remediation: `5968f271c4ecfc66733c3ccb0a23edd30e434207`  
Railway: `atelier-doclar` / `production` / `event-os` only

EOS-S05B remains **not accepted**. Do not run Claude. Do not start EOS-S06. Do not deploy Control Tower.

MD-PR-S066 independently confirmed the core dossier, publication/replay, last-known-good, client grant/revoke, Budget successor and role-boundary journeys. Do not reopen them broadly.

The release blocker is exact and evidenced: three S061 synthetic QA authority editions that S063 reported as withdrawn are again projected as `CURRENT APPROVED`, survive full reload, are included in Alpha One’s effective governing rule IDs, and generate duplicate `PUBLIC_LIABILITY / MISSING_POLICY_OR_CERTIFICATE` gaps. This is canonical/durable authority failure, not cosmetic history display.

The same focused remediation must also correct the Reviewer source-approval form that offers `Approve source` without a way to provide a required future `Review again by` date. Include the stale S063 placeholder and authority/gap legibility corrections because they are adjacent and low-risk.

## 1. Exact affected authority records

These three editions were classified as obsolete S061 synthetic QA authority and were intended to be withdrawn with immutable history retained:

| Rule key | Edition ID | Expected hash prefix |
|---|---|---|
| `s061-public-liability-1789066731022` | `00587236-fa20-4180-95c0-c0649eb728eb` | `319e04016729` |
| `s061-public-liability-1789066767651` | `cfc0b05a-8a74-4c74-a73a-71c03a99e2ab` | `40f624c3565f` |
| `s061-public-liability-1789067404599` | `6b9330b0-9563-4180-bf3a-bf2dcfb8b1f7` | `b44d73e350a1` |

Do not alter these controls:

- legitimate governing rule `s061-public-liability-1789066558518` / edition `64d4a54b-c833-4826-8756-76699ec794c2`;
- `CLAUDE-S05B-S059-B-RULE`, which must remain history-only/no approved authority;
- the four earlier S060 editions already shown as `WITHDRAWN NO AUTHORITY`.

No decision may be based only on a timestamp-like name. Match exact organisation, rule key, edition ID, content hash, fixture-classification receipt and immutable lineage.

## 2. Mandatory diagnosis before mutation

Before changing code or records, inspect and report the three representations for each exact edition:

1. normalized `risk_*` authority/rule edition row;
2. any legacy snapshot/platform-document representation still read during hydrate;
3. projected effective-authority state used by Alpha One applicability.

Inspect append-only audit and idempotency evidence for the S063 withdrawal:

- whether the withdrawal command entered the server;
- expected and resulting versions;
- whether normalized row update matched one row;
- whether audit and both idempotency receipts committed;
- whether a later command rewrote or reactivated the edition;
- whether rehydration prefers a stale snapshot representation over normalized truth;
- whether `current` and lifecycle `status` disagree;
- whether a projection incorrectly maps WITHDRAWN history to CURRENT APPROVED.

Classify the proven root cause as one or more of:

- withdrawal never durably committed;
- successful result was reported before/without durable verification;
- later replay/resurrection;
- normalized/legacy source precedence defect;
- row-diff omission;
- lifecycle/projection mapping defect;
- selector ignoring withdrawn state.

Do not use direct SQL or fixture deletion to make the UI green. Do not rewrite history. The correction and recovery must run through a governed application command.

## 3. Durable authority invariants

Implement and test these invariants:

1. A governed withdrawal updates the exact current edition using organisation + edition ID + expected version + exact content hash.
2. Zero affected rows is a conflict/not-applied outcome, never success.
3. Authority update, append-only audit, platform idempotency and risk idempotency commit in one transaction.
4. The result is verified from a bounded durable reload before the action reports success.
5. Withdrawal is immutable authority history: the edition remains queryable but cannot govern.
6. No ordinary evaluate, hydrate, fixture seed, replay, review or later draft may reactivate a withdrawn edition.
7. Restart/rehydrate preserves WITHDRAWN/non-governing truth.
8. Repeating the identical withdrawal is a truthful replay with the same decision identity and no second mutation/audit success.
9. An old approved edition cannot fall back into authority after a later explicit withdrawal unless a separately authorised successor is approved.
10. Generic snapshot mutation isolation from S064 remains intact; do not reintroduce borrowed-reference mutation.

If the existing withdrawal still passes through a whole-snapshot path where normalized authority truth can be lost, move only the affected authority classify/withdraw command to a bounded repository transaction using the established S063 pattern. Share domain decision functions; do not fork policy.

## 4. Governing selector and gap behaviour

After durable recovery:

- the three exact S061 QA editions are history-only/non-governing;
- the legitimate S061 authority remains governing;
- S059 remains history-only;
- four S060 withdrawn editions remain history-only;
- Alpha One effective governing IDs exclude the three obsolete editions;
- event evaluation does not resurrect them;
- operator gap output no longer contains duplicate gaps caused solely by those obsolete authorities.

Do not blindly deduplicate gaps by display category or policy type. Two genuinely different governing requirements may legitimately produce separate gaps. Remove duplication by correcting authority truth and, only if still needed, use a stable semantic requirement identity that preserves distinct legal/operational obligations.

If multiple different `ruleKey` values can encode the same proposition/requirement/scope, document the intended collision policy. Do not silently treat every same-policy-type rule as conflict. Use governed lineage, requirement key, jurisdiction, scope and cited proposition as appropriate.

## 5. Reviewer approval completion

Reproduce the Reviewer failure on a synthetic DISCOVERY source whose required review date is absent or expired.

Correct the UX so an eligible Risk Governance Reviewer can complete approval without encountering an impossible hidden requirement. Choose one coherent route:

- include a clearly labelled required `Review again by` date in the quick approval form; or
- replace quick approval with a link to the focused authority detail form where that required date and review evidence are entered.

Requirements:

- date must be explicit, operator-chosen and later than the current instant;
- no silent default legal/review interval;
- maker/checker remains server-enforced;
- CEO author cannot approve their own edition;
- Reviewer approves the exact ID/hash/version;
- stale/forged/cross-org request is denied with no write;
- expected validation stays in-page with safe values retained, field-specific wording, `aria-invalid`, `aria-describedby` and focus;
- successful approval persists after reload and becomes eligible only under the governing selector’s normal rules.

Use one uniquely labelled `S067` synthetic source/rule if a fresh live proof is required. Do not promote obsolete QA records merely to test the form.

## 6. Adjacent UX corrections

Make these bounded corrections:

1. Replace the hidden/default dossier reason `S063 uniquely labelled dossier edition` with neutral current product copy or an explicit operator-supplied reason. No stale slice identifier should enter new durable business records.
2. Make the raw governing-authority summary route operators to the focused queue/detail experience. Preserve access to immutable detail, but do not lead non-technical reviewers into a dense undifferentiated record dump.
3. Show a clear distinction between `GOVERNING`, `HISTORY ONLY`, `WITHDRAWN`, `STALE` and `CONFLICT` in text, not colour alone.
4. Ensure gap cards identify the governing requirement and source lineage without repeated UUID-heavy headings.

Preserve Command Atelier visual language and accessibility.

## 7. Required automated proof

Add focused tests for:

- exact-hash/version withdrawal persists through Postgres reload;
- normalized row is non-current/withdrawn and immutable history remains readable;
- audit and idempotency are atomic;
- zero-row/stale withdrawal is not applied;
- identical withdrawal replay has no second durable mutation;
- evaluate/hydrate/seed cannot resurrect withdrawn authority;
- three obsolete IDs absent from effective governing set;
- legitimate S061 ID remains;
- S059 and S060 states unchanged;
- gap output is corrected for the authority set without unsafe category-wide deduplication;
- CEO maker approval denied;
- Reviewer fresh approval succeeds with explicit future review date;
- expired/missing date gets human-safe field validation;
- cross-org/forged approval denied;
- S064 isolation tests unchanged and green;
- S063 dossier/client path unchanged and green.

Tests must assert durable rehydrate, not only returned in-memory objects. Do not change existing assertions merely to fit the implementation.

## 8. Local gates

Run focused tests while developing, then:

```bash
pnpm typecheck
pnpm --filter @maison-doclar/shared-platform test
pnpm --filter @maison-doclar/event-os test
pnpm programme:validate
pnpm --filter @maison-doclar/event-os build
git diff --check
```

All must pass with zero failures. Preserve at least shared-platform 506/506 and Event OS 102/102, with totals increasing only for genuine new tests.

Run focused Playwright locally:

- authority queue/detail withdrawal and reload;
- Reviewer approval with review date;
- event re-evaluate and effective authority/gap output;
- S063 publication/client journey once as changed-risk guard;
- S065 result targeting once if shared action forms/helpers change;
- human-safe validation if the Reviewer form changes.

Run suites separately if required by known local memory pressure. Record every first-run failure.

## 9. Deployment and governed live recovery

Push focused commits normally. Verify local = origin = GitHub main and clean worktree.

Deploy Event OS only. Do not deploy Control Tower.

After the final application SHA is live, verify alive/ready, POSTGRES, APPLIED, `productionAuthorised:false`, S05A and S05B evaluation compatibility, and providers INACTIVE.

Then, as Risk Governance Reviewer, use the governed UI/application command to recover exactly the three obsolete S061 QA editions. Before confirming, show a preview containing only the three exact IDs/hashes. Withdraw atomically if the product supports a governed batch; otherwise withdraw individually with exact evidence. Do not touch the legitimate S061 authority, S059 history or S060 history.

Live evidence must prove:

1. all three exact records show WITHDRAWN/HISTORY ONLY after full reload;
2. normalized durable reload agrees;
3. Alpha One re-evaluation excludes them from effective governing IDs;
4. legitimate authority remains governing;
5. duplicate gaps caused by those three disappear;
6. a second evaluation/reload does not resurrect them;
7. a fresh S067 source/rule follows CEO-maker denial → Reviewer exact approval with explicit future review date;
8. no external effect, no real data, no direct database manipulation.

If corpus inputs/contracts change, advance and rerun the S05B evaluation honestly. Otherwise do not restamp v6; verify compatibility. A changed authority state may legitimately change applicability output without changing corpus edition.

## 10. Focused Claude rerun boundary

Do not run Claude under S067. Stop for AI CTO review.

The subsequent Claude prompt should re-check only:

- the three exact QA editions are withdrawn/history-only and non-governing after reload/re-evaluate;
- legitimate S061 authority remains governing;
- duplicate gap effect is gone;
- one fresh CEO-authored source/rule cannot be self-approved and Reviewer approval succeeds with explicit review date;
- corrected authority-list and dossier-reason UX;
- the previously untested checkpoint, learning and inert-clause surfaces;
- a compact responsive/zoom pass on changed pages.

Do not repeat Budget, full dossier publication/client revocation, Auditor or System Administrator journeys unless code affecting them changes.

## 11. Final report

Return one report with:

- starting/final SHAs and commits;
- exact root cause of the S063-withdrawn versus S066-current contradiction;
- normalized, legacy and projection state before/after for all three IDs;
- audit/idempotency evidence;
- durable withdrawal architecture;
- selector/gap outcome;
- Reviewer form correction and exact approval evidence;
- adjacent UX corrections;
- tests, complete gates and every first-run failure;
- GitHub parity and Event OS deployment ID/SHA;
- readiness/evaluation/provider state;
- live governed recovery evidence;
- rollback/forward recovery;
- Control Tower not deployed;
- Claude not run, EOS-S05B not accepted, EOS-S06 not started.

If any obsolete edition still governs, any withdrawal is not durable, Reviewer cannot approve a valid fresh record, any full gate fails, or live recovery requires direct database manipulation, state `NOT READY FOR CLAUDE` and stop.

Only if all gates pass, end:

`EOS-S05B MD-PR-S067 DURABLE AUTHORITY WITHDRAWAL AND REVIEW COMPLETION COMPLETE — READY FOR AI CTO REVIEW AND NARROW CLAUDE REVERIFICATION — NOT ACCEPTED — EOS-S06 NOT STARTED.`

