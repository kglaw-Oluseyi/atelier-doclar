# EOS-S04A Human-Verification Procedure

**Mode:** Controlled non-production. Synthetic data only.  
**Live origin:** `https://event-os-production-bc8d.up.railway.app`  
**Sign-in:** `/sign-in` with fixture staff email and the Railway access token.  
**Do not** use real guest data, send live messages, or treat this as production authorisation.

## Confirm before walking

1. `GET /api/health/ready` shows `persistence=POSTGRES`, `migrationStatus=APPLIED`, `productionAuthorised=false`, and the expected `deployedSha`.
2. `/app/admin/system` repeats SHA, Postgres and `productionAuthorised: false`.

## Positive journeys

1. CEO: titled adult Ọmọ́tọ́lá with honorific Professor. Formal/familiar pair after confirm.
2. Blank-title adult (Adéṣínà or a new record). No inferred title.
3. Child with age band and responsible adult. No date of birth. Readiness blocked then ready.
4. Household and entourage parties with independent member links.
5. Unnamed plus-one issue; accept / decline / expire / revoke as the lifecycle allows.
6. Materialise Fọláṣadé exactly once; retry does not duplicate.
7. Governed title amend and responsible-adult change.
8. ACA-S04A: complete the assessment. Confirm the authority disclaimer remains visible after a pass.

## Negative journeys

1. Planner cannot confirm addressing.
2. Planner cannot expand S03 allowance.
3. Auditor mutations are refused.
4. Unauthenticated dossier redirects to sign-in with no guest flash.
5. Cross-event guest URL fails closed.
6. Stale version shows conflict and does not write.

## Focused final-acceptance checks (do not repeat the whole-slice pack)

Use a newly created synthetic guest. Do not mutate fixture Adéṣínà or cycle Ebun entitlement.

1. **Stale two-tab amendment.** Open the same guest in two tabs. Save a preferred-name change in tab A. Submit a different preferred name from tab B without refresh. Tab B must show the conflict alert (record changed elsewhere; attempted edit not saved). No success message. Reload. Durable value is tab A. Rejected tab B text is absent.
2. **Identical rapid double-submit.** Double-click Save Amendment with the same values. One version increment. No `CONFLICTING`. No guest attention flag. Retry without refresh is not required.
3. **Different concurrent values.** Two tabs submit different preferred names against the same version. One write wins. The other shows the same visible conflict workflow.
4. **Attention consistency.** Create a genuine field conflict (sequential different dietary values, or equivalent). Dossier and directory both show Attention required. Auditor sees the attention flag and field quality only — no extra private values in the summary.
5. **Explicit salutation.** Change a title while a preferred formal salutation still contains the former title. The authored salutation is shown and is not rewritten. Operator must update it or explicitly retain it. Both choices are recorded. Blank title and no inferred title remain unchanged.
6. **Authenticated RSC prefetch.** As CEO, Planner and Auditor, confirm `?_rsc=` on `/app`, `/app/clients`, `/app/events`, `/app/my-work`, `/app/admin/audit`, `/app/admin/system` and the guest directory is not an unexplained 503. Unauthorised routes fail closed. No private payload.
7. **Accessibility.** Conflict is an alert/live region; focus moves to the summary; in-progress controls are disabled and announced. Persistence survives reload and sign-out/sign-in.

## Responsive and accessibility

360px, tablet, desktop, 200% zoom or 640px equivalent, keyboard, reduced motion, long Yorùbá names wrapping by word.

## Evidence

Record route, role, viewport, action, expected, actual, result. Do not commit screenshots. Do not mark the slice ACCEPTED.
