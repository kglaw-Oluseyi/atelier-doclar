# Claude-in-Chrome — EOS-S04A whole-slice human-simulated verification

Use this prompt as a single self-contained brief. Return one consolidated report. Do not accept the slice.

## Bound

- Repository: `kglaw-Oluseyi/atelier-doclar` (do not modify code).
- Railway project: `atelier-doclar` only.
- Deployed Event OS: `https://event-os-production-bc8d.up.railway.app`
- Expected SHA: the `deployedSha` on `GET /api/health/ready` after P11 deploy (must match GitHub `main`).
- Production authorised must be `false`. Persistence must be `POSTGRES`. Migrations `APPLIED`.
- Synthetic data only. Do not use real guest or client data.
- Do not send email, WhatsApp or SMS. Do not take payments. Do not open another Railway project.
- Do not enter credentials independently. Ask the human operator to sign in, or stop if sign-in is not provided.
- Hidden UI is not proof of server enforcement. Where a denial matters, attempt the action or a safe forged request only if the operator supplies a session; otherwise record UNTESTABLE.
- Do not approve EOS-S04A.

## Authentication boundary

Staff sign-in: `/sign-in` with fixture emails `ceo@maison-doclar.test`, `director@maison-doclar.test`, `planner@maison-doclar.test`, `auditor@maison-doclar.test` and the operator-supplied access token. Unauthenticated `/app` and guest dossiers must redirect to sign-in without flashing guest names.

## Positive journeys

Event `00000000-0000-4000-8000-000000000021` unless a newly created synthetic record is used.

1. Create titled adult Ọmọ́tọ́lá with honorific Professor. Confirm as CEO/Director. Formal and familiar forms agree. Diacritics persist after reload.
2. Blank-title guest remains untitled.
3. Child with age band and responsible adult. No date of birth field. Blocked then READY FOR EVENT.
4. Household party: independent member links; party is not a person.
5. Entourage / INVITATION_PARTY: no inferred principal unless supplied.
6. Unnamed plus-one is a quantity, not a guest.
7. Accept / decline / expire / revoke entitlement where the lifecycle allows.
8. Materialise Fọláṣadé exactly once; retry does not create a second guest.
9. Governed title correction (versioned save).
10. Governed relationship create and type correction.
11. ACA-S04A at `/app/academy/aca-s04a`: complete or inspect assessment. Authority disclaimer remains visible after a score.

## Negative journeys

1. Planner cannot confirm addressing.
2. Planner cannot expand S03 allowance to 4 when authorised 1.
3. Auditor cannot mutate addressing, party, relationship or entitlement.
4. Cross-event guest URL fails closed.
5. Unauthenticated dossier: no guest flash.
6. Stale version: conflict, data unchanged.

## Responsive and accessibility

360px, tablet, desktop, 200% zoom if the browser permits (otherwise 640px), keyboard, reduced motion, long Yorùbá names wrap by word, visible focus, no document-level horizontal scroll.

## Evidence requirements

For each step: route, role, viewport, action, expected, actual, result (PASS / FAIL / UNTESTABLE), artifact note. Do not store secrets.

## Severity

- Blocker: identity corruption, inferred title, extra guest, cross-event leak, false success, inaccessible primary journey, productionAuthorised true.
- Major: permission bypass, missing RA readiness, S03 expansion, missing audit.
- Minor: visual polish that does not lose dignity or wrap names character-by-character.

## Report format

1. Deployed URL, SHA, health payload.
2. Journey table.
3. Role/permission table.
4. Responsive/a11y notes.
5. Academy notes.
6. Defects with severity.
7. Untestable items.
8. Explicit statement: Claude does not accept EOS-S04A.
