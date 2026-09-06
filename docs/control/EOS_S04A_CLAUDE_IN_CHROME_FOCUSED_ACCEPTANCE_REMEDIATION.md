# Claude-in-Chrome — EOS-S04A focused final-acceptance re-verification

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

Staff sign-in: `/sign-in` with `ceo@maison-doclar.test`, `planner@maison-doclar.test`, `auditor@maison-doclar.test` and the operator-supplied access token. Event `00000000-0000-4000-8000-000000000021`. Create **new** synthetic guests. Do not mutate fixture Adéṣínà or cycle Ebun entitlement.

## Checks

1. **Stale two-tab amendment.** Open one new guest in two tabs. Tab A saves a preferred-name change. Tab B submits a different preferred name against the stale version. Tab B must show a conflict alert: the record changed elsewhere; the attempted edit was not saved. No success message. Rejected values must not appear as persisted. Reload/refresh is required; retry without refresh is disabled or discouraged. Use **Reload the current record**. After reload, durable truth is tab A and Save amendment is enabled again.
2. **Identical rapid double-submit.** On a new guest, double-click Save Amendment with the same values. One version increment. Field must not be `CONFLICTING`. Guest attention must stay clear. No duplicate success write.
3. **Different-value concurrency.** Two tabs submit different preferred names against the same version. One write wins. The loser shows the same visible conflict workflow as (1).
4. **Guest-level attention.** Create a genuine field conflict (sequential different dietary values is enough). Dossier and directory both show Attention required. After resolving the field to the same value, attention clears on both. Auditor may see the attention flag and field quality only — no extra private values in the summary.
5. **Explicit salutation.** Create a guest with honorific `Dr (Mrs)` and preferred formal salutation containing that title. Change honorific to Professor without a decision: save must fail closed and leave the authored salutation unchanged. Then retain it explicitly (recorded RETAINED). On a second guest, change title and update the salutation yourself (recorded UPDATED). The system must not invent replacement wording. Blank title remains blank; no inferred title.
6. **Authenticated RSC prefetch.** As CEO, Planner and Auditor, request `?_rsc=1` (or equivalent browser prefetch) for `/app`, `/app/clients`, `/app/events`, `/app/my-work`, `/app/admin/audit`, `/app/admin/system` and the guest directory. Authorised prefetch must not be an unexplained 503. Unauthorised routes fail closed. No private payload (`DATABASE_URL`, bearer secrets, passwords).
7. **Accessibility.** Conflict uses an alert/live region; focus moves to the conflict summary. In-progress save shows a busy/disabled control. Persistence survives reload and sign-out/sign-in.

## Return

For each check: role, route, action, expected, actual, PASS / FAIL / UNTESTABLE. Note SHA, `productionAuthorised`, persistence. Do not mark EOS-S04A accepted.
