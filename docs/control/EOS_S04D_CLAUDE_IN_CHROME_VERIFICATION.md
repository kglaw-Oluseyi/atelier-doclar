# EOS-S04D Claude-in-Chrome — whole-slice independent verification

**Authority:** `MD-PR-S022`. Claude verifies. Claude does not accept EOS-S04D.  
**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
**Visual language:** Command Atelier (onyx frame, ivory working surface, champagne detail, functional accent `#8B6E38`).

Do not start EOS-S04E, EOS-S04F or EOS-S05. Do not use real guest data. Do not place vendor orders or send communications.

## Deployment gate

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `live`, `productionAuthorised`.
3. Compare `deployedSha` to `origin/main` of `kglaw-Oluseyi/atelier-doclar` after the MD-PR-S022 push.
4. Open `https://event-os-production-bc8d.up.railway.app/api/health/live`.
5. If SHA differs, persistence is not `POSTGRES`, migrations are not applied, `ready` is false, or `productionAuthorised` is true, verdict is `BLOCKED`.

Starting baseline: `2f86fee762678d01e502a23a026511cafb4e3f57`.  
Ending SHA: the live `deployedSha` after the S04D Event OS deploy (must equal `origin/main`).

Confirm migration `EOS-S04D-FORECAST-PLANNING-V1` is applied. No S04D-specific environment variables are required. Do not modify vendor secrets. Do not deploy Control Tower.

## Identities (synthetic only)

Staff access token: Railway variable `EVENT_OS_ACCESS_TOKEN` on service `event-os`. Do not paste the secret into evidence.

| Role | Email |
|------|-------|
| CEO | `ceo@maison-doclar.test` |
| Event Director | `director@maison-doclar.test` |
| Planner | `planner@maison-doclar.test` |
| Auditor | `auditor@maison-doclar.test` |

| Record | ID |
|--------|----|
| Alpha One | `00000000-0000-4000-8000-000000000021` |
| Alpha Two | `00000000-0000-4000-8000-000000000022` |
| Church phase | `00000000-0000-4000-8000-000000000090` |
| Reception phase | `00000000-0000-4000-8000-000000000091` |
| Ẹ̀bùnolúwa | `00000000-0000-4000-8000-000000000072` |
| Olúfẹ́mi | `00000000-0000-4000-8000-000000000073` |
| Named companion Bàbátúndé | `00000000-0000-4000-8000-0000000000e1` |

URLs:

- Sign-in: `https://event-os-production-bc8d.up.railway.app/sign-in`
- Event hub: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021`
- Forecast: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/forecast`
- Host projection: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/forecast/host`
- RSVP workspace: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/rsvp`
- Academy: `https://event-os-production-bc8d.up.railway.app/app/academy/aca-s04d`
- Forged event: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-ffffffffffff/forecast`
- Alpha Two: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000022/forecast`

## Known-population numerical proof

Sign in as Planner. Open the forecast workspace. Run the governed forecast if none exists.

Exact expected display for the synthetic Alpha One population:

- Whole-event distinct people: **low 3, centre 4, high 5**
- Observed RSVP: **4 attending, 1 not attending, 1 no response**
- Eligible people: **6**
- Unnamed plus-one is uncertainty, not a seventh person
- Church and reception phase centres must not equal the whole-event centre if naively summed
- The workspace must warn that phase totals are not whole-event attendance

If the centre is shown without low, high and confidence, that is a BLOCKER.

## Whole-event distinct union versus phase totals

Ẹ̀bùnolúwa is eligible for church and reception. Confirm she is one whole-event person. Do not add church + reception and label the sum whole-event attendance.

## RSVP / forecast / provision separation

The workspace must label three products. Approving provision must not change RSVP counts, guest records or write attendance. Success copy must say RSVP was not changed and that no vendor order was placed.

## Reproducibility

Run the same forecast twice with the same inputs. The range and parameter version must match. Changing RSVP later must create a new run and preserve the previous run in history.

## Uncertainty and confidence

Confirm plain-language confidence and named uncertainty drivers. Do not accept an unexplained composite score. Provisional rates must not be presented as Lagos fact.

## Override and provision maker/checker

As Planner, propose an override and a catering provision. Confirm Approve buttons are absent for the planner.

As Event Director, approve both with a reason. Confirm self-approval is impossible: the planner must not be able to approve their own proposal even if a hidden control is guessed.

## Stale concurrency

If you can trigger a second overlapping approval against a changed version, the server must fail closed with conflict language. Do not proceed if stale approval succeeds.

## Role projections

- Auditor: can view forecast and host projection; cannot run, override, provision or manage parameters.
- Planner: can run and propose; cannot approve or manage parameters.
- CEO / Event Director: governed decision authority.
- System Administrator: no model or forecast business authority by default (infrastructure only). If a sysadmin staff identity is not available in the live UI, record that backend tests deny `SYSTEM_ADMINISTRATOR` and do not invent a login.

Cross-event and forged event IDs fail closed.

## Calm host projection

After Event Director approval, open `/forecast/host`. It must show range, confidence, material uncertainty and last refresh. It must **not** show:

- parameter tables or `PARAM-SET`
- staff override rationale
- individual guest probabilities
- sensitive signals
- unapproved overrides
- technical model jargon
- audit internals

A single centre number without range and confidence is a BLOCKER.

## No sensitive inference

There must be no control, field or copy that raises attendance probability from ethnicity, religion, health, disability, wealth, class, politics, biometrics, surname, title or household address. If such a control exists, verdict is BLOCKED.

## No side effects

Forecast run, override, provision and host approval must not send communications, place vendor orders, collect payment, create companions, change invitations or write attendance.

## Calibration / history

If Director/CEO records a synthetic shadow observation of 4 against the original range, the original low/centre/high must not move. Evaluation must not release automated model adaptation.

## Responsive / accessibility

Check 360px, 768px, desktop and 200%-equivalent zoom on the forecast workspace. No document-level horizontal overflow. Keyboard focus visible. Enabled `pointer`, disabled `not-allowed`. Reduced motion: no required decorative motion. Run axe on forecast and host projection. Serious/critical axe issues are MAJOR or BLOCKER.

## ACA-S04D

Open ACA-S04D. Distinction ≥90, pass 80–89, retake <80. Submit an attempt. Completion copy must state training evidence only and must not grant operational authority, provision approval or production approval.

## Verdict language

Claude verifies. Claude does not accept EOS-S04D. Report BLOCKER / MAJOR / MINOR / observation honestly. Deployment is not acceptance.
