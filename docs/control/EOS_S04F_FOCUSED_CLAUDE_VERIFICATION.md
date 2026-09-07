# EOS-S04F focused Claude verification — source supersession and placeholders

**Authority:** `MD-PR-S026`. Claude verifies. Claude does not accept EOS-S04F.  
**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
**Do not start EOS-S05.** Do not repeat the rest of EOS-S04F. Do not use real guest data. Do not send communications or invoke a provider.

## Deployment gate

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `live`, `productionAuthorised`.
3. `deployedSha` must equal `origin/main` of `kglaw-Oluseyi/atelier-doclar`.
4. If SHA differs, persistence is not `POSTGRES`, migrations are not applied, `ready` is false, or `productionAuthorised` is true, verdict is `BLOCKED`.

Staff token: Railway `EVENT_OS_ACCESS_TOKEN` on `event-os`. Do not paste the secret.

| Role | Email |
|------|-------|
| Event Director | `director@maison-doclar.test` |
| Planner | `planner@maison-doclar.test` |

| Record | ID |
|--------|----|
| Alpha One | `00000000-0000-4000-8000-000000000021` |
| Invitation work | `00000000-0000-4000-8000-000000000134` |
| Olúfẹ́mi Alákíjà | `00000000-0000-4000-8000-000000000073` — explicit Yorùbá |

Language workspace: `/app/events/00000000-0000-4000-8000-000000000021/language`.

Use a clearly labelled synthetic change summary such as `CLAUDE-S04F-A1`. Do not rewrite approved source in place.

## Journey A — source supersession

1. Sign in as Planner. Open the invitation source card. Record current source ID, version and `APPROVED`.
2. Start a revision prefilled from that source. Change English text and purpose/context. Keep `{{guestName}}`. Submit for review.
3. Confirm the Planner cannot approve that revision.
4. Sign in as Event Director. Approve the revision.
5. Confirm the new source is current and the previous approved source remains in history as `SUPERSEDED`.
6. Confirm the linked Yorùbá translation is `STALE` and is not offered as approved current target content.
7. Confirm coverage states the source change honestly (complete may become partial / not ready / stale).
8. Assemble a preview for Olúfẹ́mi. The stale Yorùbá text must not be selected. If a current approved `en-GB` fallback is permitted, that fallback is used and the fallback reason is visible. Explicit Yorùbá preference must remain unchanged. If no approved fallback exists, assembly must fail closed.
9. Confirm the prior assembly is historical (`SUPERSEDED` or stale). Confirm not dispatched. Confirm no provider activity.

## Journey B — placeholders

Still on the language workspace translation editor, with the current source’s expected placeholder set visible:

1. Enter target text missing `{{guestName}}`. The inspector must reject it as missing. Data must not change.
2. Enter an unknown token such as `{{title}}`. The inspector must reject it as unknown. Data must not change.
3. Enter `{{guestName}}` twice when the source has one. The inspector must reject it as duplicated. Data must not change.
4. Enter a reordered valid set that still matches the source multiset. The inspector must accept it.
5. Confirm a safe final assembly can be previewed after a valid set. Markup or script in placeholder values or adjacent text must remain inert.
6. Confirm no dispatch and no provider call.

## Verdict

Report evidence for both journeys. Claude verifies. Claude does not accept EOS-S04F.
