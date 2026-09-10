# MD-PR-S058 — EOS-S05B Human-Safe Validation, Form Recovery and Release-Evidence Remediation

## 0. Authority and outcome

This is the controlling implementation authority for one consolidated EOS-S05B remediation milestone. It responds to the partial MD-PR-S057 independent browser verification. Execute the full pack continuously and return one consolidated evidence report.

The previous Claude run is valid partial evidence, not a completed whole-slice verification. Preserve its passed deployment gate, current `s05b-eval-v3` execution and completed Journey A evidence. Do not describe EOS-S05B as accepted. Do not start EOS-S06.

Required outcomes:

1. expected validation failures are presented as calm, field-specific, recoverable operator guidance;
2. rejected safe form values are retained exactly, with focus placed at the error summary or first invalid field;
3. raw schema/Zod payloads never reach the operator and validation failures never masquerade as unexpected server failures;
4. operator-facing party references use governed human-readable selection, not hand-entered UUIDs;
5. action results are scoped to the action and page that produced them and do not reappear across unrelated navigation;
6. the CEO can inspect the complete current S05B release-evidence state without blind spots;
7. the correction is applied consistently across EOS-S05B forms, not patched only for policy creation.

## 1. Exact scope and baseline

- Repository: `kglaw-Oluseyi/atelier-doclar`
- Branch: `main`
- Required GitHub/local baseline: `a66d39a8619cae93e9c905cba024fa8bd85662e1`
- Current Event OS application SHA: `e3f034f6799f7745a20a36910c06452ebece7689`
- Railway project/environment/service: `atelier-doclar` / `production` / `event-os`
- Live URL: `https://event-os-production-bc8d.up.railway.app`
- Control Tower must not be changed or deployed.

Before editing, verify the exact baseline, GitHub parity and that the worktree has no overlapping changes. If the baseline differs, stop and report the exact discrepancy. Do not reset, force-push, amend accepted history or discard unrelated work.

Read the ratified EOS-S05B corpus, MD-PR-S054–S056, the current S05B implementation/build ledger, programme state, execution compatibility, technical-debt register and MD-PR-S057 partial Claude report. Inspect the shared action-result, form-processing and error-classification paths before changing individual pages.

## 2. Evidence being remediated

MD-PR-S057 found two related product defects in the organisation policy workflow:

- a malformed insurer-party identifier produced an expected validation failure but cleared the operator's other entered values;
- the expected validation failure was rendered as a full-page unexpected server failure containing raw Zod/schema JSON.

It also identified two assurance/UX gaps:

- the previous evaluation action result could reappear after unrelated navigation back to Protection;
- the CEO-facing release surface did not expose enough current evaluation evidence to verify the exact corpus, case outcome and zero-tolerance state.

Treat the first two as symptoms of a shared form/error contract. Audit every EOS-S05B mutation form that accepts operator input. Do not solve only the one reproduced field.

## 3. Canonical action outcome contract

Create or extend one typed, shared Event OS action presentation contract. Every S05B mutation must resolve to one of these truthful applications:

| Outcome | Application | Data changed | Operator presentation |
|---|---|---:|---|
| Successful new durable mutation | `APPLIED` | yes | success result, correlation, safe next step |
| Idempotent durable replay | `REPLAYED` | no | existing result reused; never claim another write |
| Expected validation failure | `NOT_APPLIED` | no | in-page validation summary plus field errors |
| Stale/version conflict | `NOT_APPLIED` | no | record changed elsewhere; scoped retry guidance |
| Permission denial | `NOT_APPLIED` | no | action not permitted; no false success |
| Record unavailable | `NOT_APPLIED` | no | safe unavailable message; no protected detail |
| Unexpected internal failure | `NOT_APPLIED` | unknown/no claimed change | generic incident message plus correlation only |

Classification requirements:

- `VALIDATION_FAILED` and Zod parse failures are expected input failures, not `INTERNAL_ERROR`.
- `VERSION_CONFLICT`, `FORBIDDEN`/`PERMISSION_ABSENT`, `NOT_FOUND` and dependency failures retain their existing truthful semantic categories.
- Only genuinely unexpected faults use the unexpected-server-failure surface.
- Never print stack traces, Zod issue JSON, database errors, object keys, tokens, secrets, policy-number ciphertext or internal payloads to the page, URL, action recall or audit detail.
- Server logs may record a correlation ID and sanitised field/error codes; they must not record confidential entered values.
- A failed action must not create a success audit, idempotency success receipt, or partial domain mutation.

## 4. Recoverable form-state contract

For every S05B form, introduce a typed attempted-input and field-error result. Use `safeParse` at the action boundary and map issues to stable public field keys. The implementation may use `useActionState`, an equivalent server-action return contract, or an existing repository-standard mechanism, but it must satisfy all invariants below.

### 4.1 Values that must survive an expected rejection

Retain the exact submitted safe values for text, textarea, numeric, currency, date/time, select, radio and checkbox fields. Preserve Unicode in NFC form where canonical normalization is required. Preserve an explicit unknown/prefer-not state distinctly from empty.

Do not retain or echo:

- access tokens, secrets or credentials;
- file bytes or browser file-input values;
- encrypted/ciphertext fields;
- raw storage keys;
- any field whose disclosure policy forbids redisplay.

A policy number may be retained only in browser-local controlled state for the immediate correction attempt if the existing disclosure contract permits it. It must never enter a URL, server action flash, console, log or generic audit record. If safe retention cannot be guaranteed, clear only that sensitive field and explain why; do not clear the rest of the form.

### 4.2 Field errors and accessibility

- Render a calm summary heading such as `Check the highlighted information`.
- Give each invalid field a concise human message. Example: `Choose an insurer from the governed party register.` Never show `invalid uuid`, a regex, a schema path or raw JSON to the operator.
- Set `aria-invalid="true"` and connect help/error text with `aria-describedby`.
- On submit failure, focus the summary or first invalid field after render; verify the settled `document.activeElement`, not just scrolling.
- Keep the submitted value visible.
- Error text and focus must not depend on colour alone.
- The action must remain retryable after correction without a full page reload.
- At 360 px, tablet, desktop and 200% zoom there must be no document-level horizontal scroll.
- Enabled controls use pointer; disabled controls use `not-allowed`; inputs retain appropriate text/select cursor.

## 5. Remove raw UUID authoring from the premium workflow

The CEO or event lead must not be expected to type an insurer/party UUID. Replace operator-entered `insurerPartyId` and any equivalent S05B raw identity field with a governed, accessible human-readable chooser backed by the canonical organisation-scoped party/vendor register.

The chooser must:

- show a human label and sufficient non-sensitive disambiguation;
- submit the stable canonical ID invisibly;
- be event/organisation scoped server-side;
- reject a forged/cross-organisation ID even if POSTed directly;
- support keyboard operation and visible focus;
- include a clear empty state when no eligible insurer exists;
- link to the authorised party creation/management route if such a route already exists and the actor is permitted;
- never silently create an insurer, vendor or party as a side effect of policy creation.

Do not create a second party ledger. Do not repurpose guest identity, vendor roster overlays or free text as durable party identity. If other S05B forms expose raw UUIDs to operators, remediate them in the same batch.

## 6. S05B form audit and consistent application

Inspect and apply the shared contract to the material S05B authoring journeys, including at minimum:

- organisation policy creation and policy edition/evidence actions;
- source and rule authoring/approval;
- clause templates and clause review;
- vendor risk/roster authoring;
- event applicability and residual-risk decisions;
- continuity plan/checkpoint/escalation actions;
- fallback proposal/authorisation;
- incident and learning records;
- Protection budget projection;
- dossier assemble/submit/approve/publish/export;
- client acknowledgement/question actions where the client projection permits them.

Do not weaken maker/checker, concurrency, idempotency, immutable lineage, permission masking or server authority. A hidden or disabled control is not authority. Preserve event and organisation isolation.

## 7. Action-result scope and consumption

Correct action-result recall so a result is presented only in the authorised context that produced it.

Bind recalled results to at least:

- actor/session identity;
- action scope;
- subject/event/organisation identity as applicable;
- originating pathname/workspace;
- correlation ID.

Requirements:

- present a new result once in its originating context;
- a normal render or refresh may keep the historical result visible according to the established UX, but it must not steal focus again;
- navigating to an unrelated page and later returning must not resurrect a consumed evaluation/policy result;
- a new correlation must present and focus normally;
- never place result payloads or sensitive form values in the URL;
- preserve `TDR-S04F-001` honestly: do not claim process-local recall is multi-replica durable unless architecture actually changes.

The current S05A focus corrections are accepted behaviour. Reuse their correlation-aware, allowlisted focus approach rather than introducing a competing mechanism.

## 8. CEO release-evidence surface

The CEO must be able to determine the current assurance state without consulting logs or trusting a green headline. Extend the relevant System Health and/or Protection Command Portfolio Insights surface to show, permission-safely:

- deployed application SHA;
- persistence and migration status;
- `productionAuthorised`;
- S05B adapter states: object store, scan, OCR, source monitor and communications;
- S05A evaluation status without altering its accepted corpus;
- S05B evaluation edition `s05b-eval-v3`;
- full corpus hash `a5d540db67ccb6d4e4835d8b6d113903189ad3af3ab10e1c997929bef0198617`;
- total, passed, failed and persisted-result counts;
- zero-tolerance status and any blocking categories;
- run ID, provider/fixture identity, started/completed time;
- stale/incompatible/unrun/running/passed/failed status;
- `s05bEvaluationBlocked` and `s05bReleaseReady`;
- a plain-language explanation that fixture assurance is not production authorisation.

Long hashes and identifiers must wrap safely and be copyable. Do not expose secrets, access tokens, storage identifiers or protected evidence. The data must be derived from durable evaluation rows/readiness, never from hard-coded reassuring booleans.

If the implementation/evaluation contract and corpus are unchanged, do not manufacture a new corpus edition or restamp its pass. Projection-only changes must continue to report the genuine current v3 run. If a material probe/contract change is unavoidable, increment the edition honestly, make the old pass STALE, run the new corpus locally and require an authorised live CEO run.

## 9. Required tests

### 9.1 Unit/integration

Add focused tests proving:

1. Zod/validation failure maps to `NOT_APPLIED`, `didDataChange:false`, safe field messages and no raw issue JSON.
2. Safe attempted values survive the rejection; sensitive values do not enter URL/log/flash/audit.
3. Forged, invalid, cross-org and stale party IDs are server-denied.
4. The selector returns only permitted organisation-scoped choices.
5. No durable mutation, success audit or success idempotency receipt occurs on validation failure.
6. At least one form in each material workflow family uses the shared contract; no legacy full-page raw-error path remains.
7. action recall cannot cross actor, event, organisation, workspace or pathname.
8. a consumed evaluation result does not reappear after unrelated navigation.
9. the release-evidence projection derives exact counts/hash/status from durable evaluation records and fails closed for missing/incompatible results.
10. an unauthorised actor cannot access protected diagnostics.

Search for direct `Schema.parse(FormData...)`, raw `error.message`, `JSON.stringify(error/issues)`, user-facing UUID text inputs and generic catch-to-error-page patterns in S05B actions. Resolve every relevant occurrence or document why it is safe and unreachable.

### 9.2 Focused Playwright

Create a focused suite that uses synthetic records and verifies:

- policy authoring uses a human insurer chooser rather than a UUID field;
- submit one malformed/forged direct value and prove server denial;
- submit an ordinary invalid value and prove in-page field error, retained safe fields, no raw JSON, no full-page failure and correct settled focus;
- correct the field without reload and succeed once;
- repeat the validation pattern on at least two different S05B workflow families;
- a prior evaluation result does not resurrect after unrelated navigation;
- the CEO release-evidence view shows exact v3 edition/hash/counts/zero-tolerance/run identity and truthful release state;
- keyboard operation, focus, 360 px, tablet, desktop and 200% zoom on changed surfaces;
- no document horizontal overflow.

Run locally first. After deployment, run only this changed-risk suite live plus a representative Protection smoke. Do not repeat the entire already-passed MD-PR-S057 deployment/corpus/Journey A sequence unnecessarily.

## 10. Full gates, Git and deployment

Run:

1. focused new unit/integration tests;
2. `pnpm typecheck`;
3. `pnpm --filter @maison-doclar/shared-platform test`;
4. `pnpm --filter @maison-doclar/event-os test`;
5. `pnpm programme:validate`;
6. `pnpm --filter @maison-doclar/event-os build`;
7. `git diff --check`;
8. focused local Playwright.

Record every genuine first-run failure with root cause and correction. Passing retries do not erase failures.

Commit in focused commits, push normally, confirm local/origin/GitHub parity, and deploy Event OS only to Railway project `atelier-doclar`. Verify deployed SHA, live/ready, POSTGRES, migrations APPLIED, `productionAuthorised:false`, provider states and evaluation readiness. Run the focused live suite. Do not deploy Control Tower.

## 11. Prohibitions

- No real identities, clients, vendors, policies, evidence or operational data.
- No Brevo/Twilio/insurer/OCR/scan/source-monitor/provider activation.
- No communications, payments, bookings, claims, emergency dispatch or biometrics.
- No invented coverage, premium, limit, legal conclusion or compliance certainty.
- No destructive database reset, down-migration or absence-driven deletion.
- No secrets in prompts, commits, logs, screenshots or reports.
- No weakening of `productionAuthorised:false`.
- No EOS-S05B acceptance record.
- No EOS-S06 work.

## 12. Final consolidated report

Return one report containing:

- starting and final SHAs;
- commits and changed files;
- shared validation/action-state architecture;
- complete S05B forms audited and remediated;
- human insurer/party selection design and server-side isolation proof;
- retained-field and sensitive-field treatment;
- exact error-classification matrix;
- action-result scoping/consumption proof;
- CEO release-evidence fields and their durable sources;
- focused and full gate results;
- every first-run failure;
- GitHub parity;
- Event OS deployment ID/SHA/readiness;
- current S05B corpus edition/hash/run/counts and whether it was legitimately preserved or changed;
- live focused evidence;
- rollback/forward recovery;
- explicit confirmations that Claude was not run, EOS-S05B was not accepted, EOS-S06 was not started, Control Tower was not deployed and production remains unauthorised.

Stop for independent AI CTO review. Do not self-accept the slice.

`EOS-S05B MD-PR-S058 HUMAN-SAFE VALIDATION AND RELEASE-EVIDENCE REMEDIATION AUTHORISED — IMPLEMENT, VERIFY, DEPLOY EVENT OS ONLY, REPORT, THEN STOP — NOT ACCEPTED — EOS-S06 NOT STARTED.`
