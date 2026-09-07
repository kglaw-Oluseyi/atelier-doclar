# EOS-S04E focused Claude-in-Chrome re-verification

**Authority:** `MD-PR-S024`. Claude verifies. Claude does not accept EOS-S04E.  
**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
**Visual language:** staff Command Atelier; host Atelier may use quieter editorial composition and decorative metal `#B79F85`. Functional light-surface accent remains `#8B6E38`.

Do not start EOS-S04F or EOS-S05. Do not use real host, client or guest data. Do not send communications, invoke providers or collect payments.

Do **not** repeat magic-link replay/forge or basic staff/host session separation. Those already passed.

## 1. Deployment gate

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `live`, `productionAuthorised`.
3. Compare `deployedSha` to `origin/main` of `kglaw-Oluseyi/atelier-doclar`.
4. Open `https://event-os-production-bc8d.up.railway.app/api/health/live`.
5. If SHA differs, persistence is not `POSTGRES`, migrations are not applied, `ready` is false, or `productionAuthorised` is true, verdict is `BLOCKED`.

Remediation baseline: `413e6b988ded27b047f12d885cdcd9bacfe41b0f`.  
Ending SHA: the live `deployedSha` after this remediation deploy (must equal `origin/main`).

Confirm environment variable **names** `EVENT_OS_ATELIER_LINK_PEPPER` and `EVENT_OS_ATELIER_SESSION_SECRET` exist on service `event-os`. Do not print, copy or screenshot values. Do not deploy Control Tower.

## Identities (synthetic only)

Staff access token: Railway variable `EVENT_OS_ACCESS_TOKEN` on service `event-os`. Do not paste the secret into evidence.

| Role | Email |
|------|-------|
| Event Director | `director@maison-doclar.test` |
| Planner | `planner@maison-doclar.test` |
| Auditor | `auditor@maison-doclar.test` |

| Record | ID |
|--------|----|
| Alpha One | `00000000-0000-4000-8000-000000000021` |
| Genesis | `00000000-0000-4000-8000-0000000000f7` |
| Seed narrative | `00000000-0000-4000-8000-0000000000f8` |
| CLAUDE-S04E-A1 | `058532b3-b214-4682-89f7-42b01edceab6` |
| Original principal grant | `7aec7573-c34c-47d6-b5be-e4bc9b912fc6` (`canDecide` was `false`; preserve this record) |
| Principal host | `00000000-0000-4000-8000-0000000000f0` Adérónké Alákíjà |
| Read-only host | `00000000-0000-4000-8000-0000000000f5` Bísí Observer |
| Executive assistant | `00000000-0000-4000-8000-0000000000f3` Kẹ́hìndé Adewale |

URLs:

- Sign-in: `https://event-os-production-bc8d.up.railway.app/sign-in`
- Staff Atelier: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/atelier`
- Academy: `https://event-os-production-bc8d.up.railway.app/app/academy/ACA-S04E`
- Academy alias: `https://event-os-production-bc8d.up.railway.app/app/academy/aca-s04e`

## 2. Publish a second edition

Sign in as Event Director. Open the staff Atelier.

1. Confirm the current edition identifier. CLAUDE-S04E-A1 `058532b3-b214-4682-89f7-42b01edceab6` must still exist.
2. Confirm the editor source is one coherent draft or published edition. Story, Pillars, Atmosphere, Cultural intent, Design direction and Provenance must come from that source. They must not fall back to hardcoded seed sentences such as “Warm ivory rooms and considered language.”
3. Change provenance to a new synthetic label, for example `CLAUDE-S04E-A2 — governed second synthetic edition`. Keep the other current fields unless you are proving a deliberate change.
4. Publish a new narrative edition.
5. Success copy must say this **supersedes** the prior published edition and must name the preserved prior edition ID. It must not claim “earlier editions remain preserved” as a generic unearned sentence if this is a supersede.
6. If the publish fails, the banner must not claim history was preserved.

## 3. First edition preserved and visible in staff history

1. “Earlier published editions” must be at least 1.
2. Edition history must show CLAUDE-S04E-A1 as retained history (`SUPERSEDED` or equivalent durable history), with its identifier, publication timestamp and change/provenance text.
3. Do not delete or rewrite Claude’s edition. Do not patch Postgres.

## 4. Staff editor and host projection agree across all fields

1. After publish, record staff-editor values for Story, Pillars, Atmosphere, Cultural intent, Design direction and Provenance.
2. Hard-refresh the staff page. Values must be the same current edition/draft.
3. Issue or renew a **decision-capable** Principal Host invitation (`May decide`). Open the host link in a **separate browser context**.
4. Host Vision must match the staff values field by field, including provenance `CLAUDE-S04E-A2` (or the label you published).
5. Host must not see unpublished drafts, private guest notes, child/care detail, medical detail, security tactics, credentials, individual forecast probabilities, raw model parameters, vendor bank data, internal commercial notes or unrestricted audit.

## 5. `canDecide=true` persists

1. On staff, the grant list must show **May decide** for the new/renewed principal grant.
2. The original grant `7aec7573-c34c-47d6-b5be-e4bc9b912fc6` must remain as history (`SUPERSEDED` or `REVOKED`). Do not edit its stored `canDecide` body.
3. Principal Host role alone must not look capable if a grant is explicitly `Cannot decide`.
4. Sign out/in as director and confirm the durable grant still shows May decide.

## 6. Principal Host completes a governed decision

1. On staff, publish a dedicated synthetic decision (the “Publish this decision request” form is sufficient). Keep review required. Leave step-up unchecked unless you are testing step-up separately.
2. In the host context, the decision-capable Principal Host must see it.
3. Submit one choice.
4. Receipt must record: submitted choice; canonical data changed: no; review status; next owner; correlation ID.
5. Confirm RSVP, forecast, programme and merchandise truth did not change.

## 7. Read-only Host cannot decide

Issue a read-only invitation. In a new host context, confirm the host can read permitted chapters and cannot submit a decision.

## 8. Receipt and maker/checker truth

1. Return to staff as Event Director. The pending receipt must show the submitted choice and unchanged canonical data.
2. Accept it.
3. Planner must not be able to check a consequential request they published.
4. A different authorised checker (Director, if they did not publish that request) may decide.
5. Reload the host Atelier. The host must see the final durable receipt.

## 9. Stale / duplicate decision handling

1. Rapid identical submission must create one response/receipt.
2. A stale different choice must conflict visibly and record nothing new.
3. After reload, a still-open different decision may succeed.

## 10. Revocation

Revoke the decision-capable grant. The host context must lose decision authority immediately. A later submit must fail closed. The revoked grant record must remain.

## 11. Privacy projection

From Principal Host, Co-host, Read-only Host, Executive Assistant or Family Representative, and staff liaison/auditor views, confirm server-side projections exclude the private classes listed in section 4. Executive Assistant must not edit another adult’s RSVP or acquire staff authority. Unauthenticated, expired or revoked access must fail closed without disclosing another event or host.

## 12. ACA-S04E delivery and thresholds

1. Open `/app/academy` as director. ACA-S04E must be visible.
2. Open `/app/academy/ACA-S04E` and `/app/academy/aca-s04e`. Both must resolve on Railway/Linux.
3. Confirm the course states that completion grants no Event OS permission, role, decision authority, gate signature or production authority.
4. Submit an assessment. Distinction is ≥90%, pass is 80–89%, retake is below 80%.
5. An ineligible/unassigned user must fail closed.

## 13. Premium / responsive / accessibility of the repaired surfaces

Review staff editor, edition history, host Vision, decision and receipt at 360px, 768px, desktop and 200%-equivalent.

Confirm:

- no document-level overflow;
- editor fields hydrate visibly and coherently;
- history remains navigable;
- decision and receipt remain usable;
- pointer / not-allowed cursors;
- visible focus;
- reduced motion;
- sufficient contrast;
- logical headings;
- live-region results;
- media alt text;
- no serious/critical axe violation;
- no console/runtime error.

Staff remains Command Atelier. Host remains a commissioned editorial Maison.

## Verdict

Record pass/fail per section with exact IDs, receipts and wording. Claude verifies. Claude does not accept EOS-S04E.
