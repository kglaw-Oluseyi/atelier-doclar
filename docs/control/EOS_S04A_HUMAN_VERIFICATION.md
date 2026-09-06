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

## Responsive and accessibility

360px, tablet, desktop, 200% zoom or 640px equivalent, keyboard, reduced motion, long Yorùbá names wrapping by word.

## Evidence

Record route, role, viewport, action, expected, actual, result. Do not commit screenshots. Do not mark the slice ACCEPTED.
