# EOS-S04D focused Claude-in-Chrome verification

Claude verifies. Claude does not accept EOS-S04D.

**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
Do not start EOS-S04E/F or EOS-S05. Do not repeat forecast numerical modelling, full maker/checker, host projection, calibration, responsive or no-side-effect journeys already passed.

Staff token: Railway `EVENT_OS_ACCESS_TOKEN` on `event-os`. Do not paste it into evidence.

| Role | Email |
|------|-------|
| CEO | `ceo@maison-doclar.test` |
| Event Director | `director@maison-doclar.test` |
| Planner | `planner@maison-doclar.test` |

Alpha One: `00000000-0000-4000-8000-000000000021`  
Forecast: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/forecast`  
Academy index: `https://event-os-production-bc8d.up.railway.app/app/academy`  
ACA-S04D: `https://event-os-production-bc8d.up.railway.app/app/academy/ACA-S04D`

## Checks

1. Open `/api/health/ready`. Record `deployedSha`, persistence, migrations, `productionAuthorised`. Compare `deployedSha` to `origin/main`. If they differ, or persistence is not Postgres, or `productionAuthorised` is true, verdict is BLOCKED.
2. Reproduce denial → later success for override then provision (CEO or Event Director: propose override, self-approve so the server refuses, then propose provision).
3. Confirm only the later success banner appears: one banner, success status, provision action name, no leftover FORBIDDEN copy.
4. Confirm durable state and the banner correlation id match the consequential audit entry for that provision write.
5. Sign out after a denial, sign in as a different actor, complete a success, and prove no stale banner transferred.
6. ACA-S04D is visible in the Academy index for the signed-in eligible role, with title and version.
7. Direct route `/app/academy/ACA-S04D` loads. A role without Academy assignment fails closed per Academy policy.
8. Course topics cover RSVP/forecast/provision separation, people vs invitations/parties, phase vs whole-event totals, provisional parameters, uncertainty/confidence, sensitive-inference prohibition, maker/checker, stale decisions, and calibration without rewriting history. Scoring: distinction ≥ 90, pass 80–89, below 80 requires retake.
9. Completing the course grants no operational permission, assignment, approval or production authority.
10. On the forecast workspace, Church **Eligible people (distinct guest IDs)** and **Forecast centre (people)** are labelled separately and match current durable membership. Do not require church eligible = 3 if live membership is 4. Whole-event attendance remains a distinct-person union; do not add phase totals.

Report first-run product failures honestly. Do not accept EOS-S04D.
