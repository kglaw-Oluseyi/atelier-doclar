# EOS-S04E Claude-in-Chrome — whole-slice independent verification

**Authority:** `MD-PR-S024`. Claude verifies. Claude does not accept EOS-S04E.  
**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
**Visual language:** staff Command Atelier; host Atelier may use quieter editorial composition and decorative metal `#B79F85`. Functional light-surface accent remains `#8B6E38`.

Do not start EOS-S04F or EOS-S05. Do not use real host, client or guest data. Do not send communications, invoke providers or collect payments.

## Deployment gate

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `live`, `productionAuthorised`.
3. Compare `deployedSha` to `origin/main` of `kglaw-Oluseyi/atelier-doclar` after the MD-PR-S024 push.
4. Open `https://event-os-production-bc8d.up.railway.app/api/health/live`.
5. If SHA differs, persistence is not `POSTGRES`, migrations are not applied, `ready` is false, or `productionAuthorised` is true, verdict is `BLOCKED`.

Starting baseline: `3463590e5b3f6f2b4070140c73ee803386542c39`.  
Ending SHA: the live `deployedSha` after the S04E Event OS deploy (must equal `origin/main`).

Confirm migration `EOS-S04E-ATELIER-V1` is applied. Confirm environment variable **names** `EVENT_OS_ATELIER_LINK_PEPPER` and `EVENT_OS_ATELIER_SESSION_SECRET` exist on service `event-os`. Do not print, copy or screenshot values. Do not deploy Control Tower.

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
| Principal host | `00000000-0000-4000-8000-0000000000f0` Adérónké Alákíjà |
| Read-only host | `00000000-0000-4000-8000-0000000000f5` Bísí Observer |
| Decision | `00000000-0000-4000-8000-000000000112` Welcome words |

URLs:

- Sign-in: `https://event-os-production-bc8d.up.railway.app/sign-in`
- Event hub: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021`
- Staff Atelier: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/atelier`
- Host unavailable: `https://event-os-production-bc8d.up.railway.app/atelier/unavailable`
- Forged host link: `https://event-os-production-bc8d.up.railway.app/atelier/forged-not-a-real-token`
- Academy: `https://event-os-production-bc8d.up.railway.app/app/academy/ACA-S04E`
- Academy alias: `https://event-os-production-bc8d.up.railway.app/app/academy/aca-s04e`

## Premium visual quality

Staff workspace must remain Command Atelier. Host Atelier must feel commissioned: editorial type, generous space, ivory/parchment, onyx framing, restrained metal. It must not look like a SaaS dashboard, ticket queue or Gantt chart. Decorative gold must not mark required state. Enabled controls use a pointer cursor.

## Staff publish and host journey

Sign in as Event Director. Open Alpha One → Private Atelier.

1. If publication is DRAFT, reveal the Atelier to hosts.
2. Confirm chapters/narrative are prepared. Do not expect operational task boards.
3. Issue a principal host invitation. Open the issued link in a **separate browser context** with no staff cookie.
4. Confirm the URL drops the token and becomes `/atelier`.
5. Confirm Vision, Blueprint, Journey, Decisions, Editions, Updates and Assurance are readable at an aggregate level.
6. Assurance must not show individual probabilities, `PARAM-SET`, credentials, security tactics or restricted notes.
7. Submit “A short family blessing”. Receipt must say canonical data did not change and review is pending.
8. Replay the same invitation URL. It must fail closed with no host/event existence disclosure.

## Separate sessions

In the host context, confirm cookie `md_event_os_atelier` exists and `md_event_os_session` does not. In the staff context, the reverse. Opening `/app` in the host context must not inherit host authority.

## Host-role projections

Issue a read-only invitation. In a new context, confirm the host can read permitted chapters and cannot submit a decision.

## Maker/checker

Return to staff as Event Director. Accept the pending welcome-words receipt. Planner must not be able to approve a decision they published. Success copy must not claim RSVP, forecast or programme changed.

## Concurrency and revocation

Issue a fresh principal invitation, exchange it, then revoke the grant. The host session must fail closed. A stale expected version must not overwrite an already submitted decision.

## Privacy

Host surfaces must not expose raw guest private notes, child/care detail, vendor bank details, staff performance, unrestricted audit, or other events.

## Edition history

Publish a new narrative edition from staff. Confirm the previous edition count is preserved and the host sees the current published story, not an unpublished draft.

## Responsive / accessibility

Check staff Atelier and host story at 360px, 768px, desktop and 200%-equivalent zoom. Keyboard focus must be visible. Reduced motion must not leave the story unreadable. Run axe on both surfaces.

## ACA-S04E

Open `/app/academy/ACA-S04E` and the `aca-s04e` alias. Confirm the course is registered, thresholds remain distinction 90 / pass 80–89 / retake below 80, and completion copy states that training evidence grants no Event OS permission, host access, operational authority, protected-gate approval or production authorisation.

## Verdict

Record PASS / PASS WITH OBSERVATIONS / BLOCKED. Claude verifies. Claude does not accept EOS-S04E.
