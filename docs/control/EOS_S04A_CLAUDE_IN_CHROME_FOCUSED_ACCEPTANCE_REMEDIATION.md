# Claude-in-Chrome — EOS-S04A final focused acceptance evidence

Use this prompt only. Do **not** repeat the already-passed whole-slice journeys. Return one short report. Do not accept the slice.

## Bound

- Repository: `kglaw-Oluseyi/atelier-doclar` (do not modify code).
- Railway project: `atelier-doclar` · service `event-os` only.
- Deployed Event OS: `https://event-os-production-bc8d.up.railway.app`
- Expected SHA: `deployedSha` on `GET /api/health/ready` must match GitHub `main`.
- `productionAuthorised` must be `false`. Persistence `POSTGRES`. Migrations `APPLIED`.
- Synthetic data only. Do not use real guest or client data. Do not send messages or take payments.
- Do not enter credentials independently. Ask the human operator to sign in, or stop.
- Do not approve EOS-S04A.
- Do not mutate fixture Adéṣínà or cycle Ebun entitlement.
- Create **new** synthetic guests for RETAIN, UPDATE and recovery. The earlier synthetic guest `6d16f61c-2eaf-4f17-acfd-7896e183848a` may be inspected; do not rewrite its append-only `2026-09-07T00:39:25.865Z` audit.

Staff sign-in: `/sign-in` with `ceo@maison-doclar.test`, `planner@maison-doclar.test`, `auditor@maison-doclar.test` and the operator-supplied access token. Event `00000000-0000-4000-8000-000000000021`.

## Checks

1. **RETAIN exact-value preservation.** As CEO, create a guest with honorific `Dr` and preferred formal salutation `Dr Adérónkẹ́ …` including Yorùbá diacritics. Change honorific to `Mr`. Choose **Keep this salutation unchanged**. Save once. Formal preview (`data-testid="formal-salutation"`) and the preferred-formal field must remain the authored `Dr …` text byte-for-byte. Honorific may be `Mr`. The preview must not become `Mr Adérónkẹ́ …`.
2. **UPDATE exact authored value.** On a second new guest, start with honorific `Professor` and an authored `Professor …` salutation. Change honorific to `Dr`. Type an explicit replacement salutation. Choose **I am updating this salutation**. Save once. Persist and display exactly that authored replacement. Do not accept inferred wording.
3. **Audit/value agreement.** After (1) and (2), confirm the last governed choice is `RETAINED` or `UPDATED` respectively, and that the stored/displayed salutation agrees with that decision. A `RETAINED` audit must not accompany a changed salutation.
4. **One-click conflict recovery.** Open one new guest in two tabs. Tab A saves a preferred-name change. Tab B submits a different preferred name against the stale version. Tab B must show the conflict alert and locked mutation controls. Activate **Reload the current record** once. The conflict banner must clear, forms must unlock, Save amendment must be enabled, and focus should land on the refreshed status or a usable form. Do not use F5 as a second recovery step.
5. **Repeated conflict recovery.** After (4), cause a second conflict on the same guest and activate **Reload the current record** once again. The form must unlock again without a full browser reload.
6. **Planner Access denial.** Sign in as Planner. Open `/app/admin/access`. The destination may remain in navigation. The page must be a controlled denial. No enabled Grant assignment form. No person, role, assignment or event catalogue for granting.
7. **Auditor Access denial.** Sign in as Auditor. Repeat (6). Same controlled denial. No enabled grant form.
8. **Direct assignment-mutation denial.** Where safely testable (browser request / DevTools against the same origin, still as Planner or Auditor), submit a grant-assignment mutation. It must fail closed. The response must not echo the attempted person, role or scope as a success payload.
9. **Authorised CEO access workflow.** As CEO, `/app/admin/access` must show the Grant assignment form enabled. Do not grant a standing production role unless the operator asks. Confirm the form is present and permitted.
10. **RSC-prefetch status with network evidence.** As CEO, Planner and Auditor, capture DevTools/network for ordinary navigation and `?_rsc=1` (or equivalent prefetch) of `/app`, `/app/admin/access`, `/app/admin/audit` and `/app/admin/system`. Record status codes. Authorised routes must not be unexplained origin 503s. Denied routes must be controlled denials. If the browser monitor reports 503, correlate cancelled/aborted prefetch vs a completed origin 503. Do not treat an aborted prefetch as an application defect without that distinction.
11. **Absence of sensitive system data.** Open `/app/admin/system` as Planner and Auditor. Deployed SHA and the non-secret Railway project name `atelier-doclar` may appear. There must be no database URL, credential, token, secret environment value, or sensitive infrastructure control.
12. **Persistence after reload / sign-out / sign-in.** After a successful RETAIN or UPDATE, reload the dossier. Sign out and sign in again. The authored salutation and honorific must still agree with the governed decision.

## Return

For each check: role, route, action, expected, actual, PASS / FAIL / UNTESTABLE. Note SHA, `productionAuthorised`, persistence, and any network status evidence for prefetch. Do not mark EOS-S04A accepted.

## Dated decision — 2026-09-07

This historical verification prompt is retained. It is not rewritten.

ChatGPT independently accepted EOS-S04A after the Claude-in-Chrome final focused session returned zero BLOCKER and zero MAJOR findings against SHA `8f1957d2353db539449d9bcce62f9e4d71eb31af`. Canonical acceptance: `docs/control/EOS_S04A_ACCEPTANCE.md`.
