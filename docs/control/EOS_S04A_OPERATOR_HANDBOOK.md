# EOS-S04A Operator Handbook

**Slice:** EOS-S04A — Guest Addressing, Relationships and Party Entitlements  
**Status:** Implemented and deployed for controlled non-production use. **Not accepted.**  
**Product:** Event OS  
**Academy delta:** ACA-S04A  
**Production authorised:** `false`

This handbook is the operational handover for P10. Historical “Railway untouched / no deployment” wording in earlier S04A prompts is superseded by `DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md`. Domain, privacy and protected-gate safeguards remain controlling.

## Distinctions operators must keep

| Concept | Meaning |
|---------|---------|
| Guest identity | One operational guest ID per represented person, including each child and each named companion |
| Party / household / entourage | A relationship container with its own ID. Never a person |
| Invitation authority | EOS-S03 only |
| RSVP authority | EOS-S03 only |
| Entitlement | S03 quantity plus the S04A companion lifecycle that sits on that authority |
| Nomination | A declared companion on an entitlement. Not yet necessarily a new guest |
| Materialised guest | Exactly one guest created or resolved from a nomination |
| Course completion | Academy training evidence |
| Operational authorisation | Active Event OS assignment and server permission |
| Production authorisation | Unsigned. `productionAuthorised` remains false |

## Guest intake

Use `/app/events/:eventId/guests/new`. Record given name, optional middle names, family name, optional honorific, professional title, traditional title, post-nominals, preferred display name, preferred formal salutation, optional pronunciation, and age band. Titles are never inferred. A full date of birth is not collected. Yorùbá diacritics must be typed and must survive reload. Optional and required labels are shown on the form. Server validation is displayed in the operational state. Double submit is protected by an idempotency key.

## Optional structured titles

Honorific is a structured optional field. Leave it blank when no title was supplied. Blank remains blank. Do not guess Mr, Mrs, Dr, Chief or gender from a name or relationship.

## Addressing source and confirmation

Save addressing with source and reason. Confirmation is a separate permission (`guest.addressing.confirm`). Planner may administer and cannot confirm. Event Director and CEO remain governed. Auditor is read-only.

## Formal and familiar rendering

An authored preferred formal salutation is used for the formal projection whenever it exists, including after a retained title change while addressing remains unverified. Familiar form uses preferred display name or given name. Directory and communications use these projections. Do not concatenate honorifics by hand. A title change never rewrites a retained salutation.

## Parties and membership

A party has type (including HOUSEHOLD and INVITATION_PARTY), label, optional principal only when explicitly supplied, members and member roles. Add and remove are versioned. Removing a member does not delete the guest. Each member has an independent dossier link.

## Principal / lead semantics

Do not infer a principal from the dossier you started on. The creating guest is added as MEMBER, or PRINCIPAL only when that role was selected.

## Relationships and provenance

Declared relationships carry type, direction, source and visibility. They are not household records. Responsible-adult links are the governed child relationship. Correct a wrong adult by ending the link and creating a new one.

## Children and responsible adults

Use age band only. A child requiring an adult cannot be READY FOR EVENT without a valid active link. Ending the link returns BLOCKED. No date of birth field exists.

## Companion entitlement lifecycle

S03 remains the quantity authority. S04A administers AVAILABLE, NOMINATED, CONFIRMED (accept), DECLINED, EXPIRED, REVOKED and exception review. An unnamed allowance is not a guest and must not inflate people counts. Planner may administer the routine lifecycle and cannot expand S03 allowance or review exceptions.

## Named companion materialisation

Materialise from an unnamed allowance by resolving an existing guest or supplying names. Exactly one guest is created or resolved. Retry is idempotent. The unnamed allowance must disappear as a person-shaped row.

## Corrections and amendments

Title correction is a versioned addressing amend. Relationship correction is a governed end/replace of a declared link. Stale `expectedVersion` is a conflict: reload, then retry if still required.

## Role permissions

| Role | Typical S04A work |
|------|-------------------|
| CEO | Oversight, confirmation, exception review, governed mutation |
| Event Director | Confirmation, party, child, entitlement administration, exception review |
| Planner | Routine capture, party, child, entitlement administer. No confirm. No S03 expansion. No exception review |
| Auditor | Read approved projections. Mutations refused |
| Unauthenticated | Sign-in required. No guest flash |

Server denial is the authority. Hidden buttons are not.

## Privacy projections

Dossiers show minimum-necessary addressing, party, child readiness and entitlement projections. Raw household, child protocol and out-of-scope records are not exposed. Cross-event access fails closed.

## Event isolation

Every mutation is event-scoped. A forged event ID is not-found or forbidden.

## Optimistic conflicts

Conflict means another approved write landed first. Data did not change from your submit. Reload before editing again.

## Audit evidence

Success, denial and failure write append-only audit (`guest.addressing.confirmed`, `guest.party.*`, `guest.entitlement.*`, child link actions). Inspect `/app/admin/audit`.

## Postgres persistence

Deployed Event OS uses Postgres. `/api/health/ready` reports `persistence: POSTGRES`, `migrationStatus: APPLIED` and `deployedSha`. Local e2e uses the file store.

## Synthetic-data operation

`EVENT_OS_ALLOW_FIXTURES=1` and fixture staff emails remain the only identities. Do not load real guest or client data. Do not run the global synthetic cleanup during ordinary P08–P11 work (`TDR-S04A-011`).

## Rollback and recovery

S04A rollback is collection-scoped and receipt-based. Do not clear S04A collections heuristically. Restart survival is proven for isolated P09 records. Academy attempts persist in `event_os_academy_delta` on Postgres or `data/academy-s04a.json` locally.

## Deployed health and SHA

- Live: `https://event-os-production-bc8d.up.railway.app`
- Ready: `/api/health/ready`
- System: `/app/admin/system`
- SHA source: `RAILWAY_GIT_COMMIT_SHA` or `EVENT_OS_GIT_SHA`

## Human-verification procedures

See `docs/control/EOS_S04A_HUMAN_VERIFICATION.md` and the Claude-in-Chrome whole-slice prompt issued at P11.

## Academy

`/app/academy/aca-s04a` is the ACA-S04A delta. It uses the existing role/learning-path model. Pass 80–89%. Distinction ≥90%. Below 80% requires retake. Completion is not operational authorisation.

## Current limitations

- `TDR-S04A-011` — browser-created residue is not fully attributable for global cleanup. Blocking before client onboarding.
- `TDR-S04A-012` — RSC prefetch 503: local and sequential origin fetches are controlled; classify against Railway/Event OS logs before treating browser-monitor 503s as origin defects.
- `TDR-S04A-016` / `TDR-S04A-017` — Claude MAJOR acceptance defects; implemented; close only with deployed evidence.
- `TDR-S04A-018` / `TDR-S04A-019` / `TDR-S04A-020` — RETAIN display corruption, one-click recovery lock, and Access Administration exposure; implemented; close only with deployed evidence.
- Preferred formal salutation is authored. Title change never silently rewrites it; mismatch requires update or explicit retention. Access administration requires `assignment.manage`. `/app/admin/system` is an intentional non-secret readiness projection for assigned staff.
- `TDR-S04A-015` — no physical offline-browser matrix.
- Permanent IdP is not selected.
- Synthetic data is still present.
- External email, WhatsApp, SMS, payments, biometrics and public client admission remain disabled.
- Guest Concierge and Gate/Security are not system roles (`TDR-S04A-001`).
- Programme catalogue has no EOS-S04A accepted-slice id (`TDR-S04A-002`). That omission is intentional; do not invent catalogue acceptance.
