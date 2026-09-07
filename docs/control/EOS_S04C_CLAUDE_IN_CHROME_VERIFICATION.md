# EOS-S04C Claude-in-Chrome — whole-slice independent verification

**Authority:** `MD-PR-S020`. Claude verifies. Claude does not accept EOS-S04C.  
**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
**Visual language:** Command Atelier (onyx frame, ivory working surface, champagne detail, functional accent `#8B6E38`).

Do not start EOS-S04D, EOS-S04E, EOS-S04F or EOS-S05. Do not contact real vendors or guests. Do not collect payments.

## Deployment gate

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `live`, `productionAuthorised`.
3. Compare `deployedSha` to `origin/main` of `kglaw-Oluseyi/atelier-doclar` after the MD-PR-S020 push.
4. Open `https://event-os-production-bc8d.up.railway.app/api/health/live`.
5. If SHA differs, persistence is not `POSTGRES`, migrations are not applied, `ready` is false, or `productionAuthorised` is true, verdict is `BLOCKED`.

Starting baseline: `9a79a443b7f08e727db12c9ea8dc4da8a557d8c0`.  
Ending SHA: the live `deployedSha` after the S04C Event OS deploy (must equal `origin/main`).

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
| Ẹ̀bùnolúwa Alákíjà | `00000000-0000-4000-8000-000000000072` |
| Olúfẹ́mi Alákíjà | `00000000-0000-4000-8000-000000000073` |
| Bàbátúndé Ọlábọ̀dé | `00000000-0000-4000-8000-0000000000ac` |
| Folákẹ́ Ọlábọ̀dé | `00000000-0000-4000-8000-0000000000ad` |
| Adéwálé Ọkẹ́ | `00000000-0000-4000-8000-0000000000ae` |
| Yétúndé Àlàdé | `00000000-0000-4000-8000-0000000000af` |
| Ọmọ́tọ́lá Adéyẹmí | `00000000-0000-4000-8000-0000000000b0` |
| Vendor token (synthetic) | `s04c-vendor-token-not-for-production-aso-oke` |
| Other-vendor token | `s04c-other-vendor-token-not-for-production` |

URLs:

- Sign-in: `https://event-os-production-bc8d.up.railway.app/sign-in`
- Merchandise: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/merchandise`
- Guest directory: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/guests`
- Olúfẹ́mi dossier: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/guests/00000000-0000-4000-8000-000000000073`
- RSVP workspace: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/rsvp`
- Vendor exchange: `https://event-os-production-bc8d.up.railway.app/vendor/s04c-vendor-token-not-for-production-aso-oke`
- Vendor portal: `https://event-os-production-bc8d.up.railway.app/vendor`
- Academy: `https://event-os-production-bc8d.up.railway.app/app/academy/aca-s04c`
- Forged merchandise: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-ffffffffffff/merchandise`
- Forged vendor: `https://event-os-production-bc8d.up.railway.app/vendor/forged-not-a-real-token`

## Sessions

Use three browser contexts. Never reuse a staff cookie on `/vendor`. Never reuse a vendor cookie on `/app`.

1. Staff CEO, then Event Director, Planner, Auditor (sign out between roles).
2. Guest access issued from Olúfẹ́mi and Yétúndé dossiers (`Issue guest access` → `Open guest access`).
3. Vendor access from the merchandise “Open assigned vendor portal” link, and again from an anonymous context.

## Primary journey

1. CEO opens merchandise. Confirm parent, friend, family and named offers. Confirm church-phase applicability does not grant attendance. Confirm no amount, card or receipt fields.
2. Confirm Bàbátúndé and Folákẹ́ remain independent guest IDs inside Parents. Cohort copy must not say they are the same person.
3. Confirm Ọmọ́tọ́lá’s named gele is an individual override, not an invitation.
4. Issue Olúfẹ́mi guest access. On `/rsvp`, RSVP remains independent. Record or confirm consented cap circumference in inches only. Confirm no chest, waist, dress-size or inferred-size fields. Withdraw consent if shown.
5. Issue Yétúndé guest access. Record `DECLINE_GRACEFULLY`. Confirm Folákẹ́’s guest access, if opened, does not show Yétúndé’s private choice.
6. Open the vendor portal as Aso-Oke House. Confirm assigned fulfilments only. Submit an attributed milestone. Return as CEO and confirm the report is vendor-attributed, not Maison Doclar payment truth.
7. Record a delay exception as CEO/Director. Confirm it does not change RSVP or admission.

## Phase-specific offer targeting

Collection “Traditional ceremony aso-oke” lists the church phase. Confirm this is targeting only. Opening S04B programme/credentials must remain unchanged. Merchandise must not write attendance.

## Identity and RSVP separation

On a guest dossier, RSVP, party/phase and merchandise cards remain adjacent. Changing a merchandise choice must not change attendance intent. A household or party must never be selectable as the offer subject.

## Optional consented cap circumference

Only `head circumference (inches)` plus an explicit consent checkbox. Range roughly 18–26. Absent consent must refuse. Withdrawal must be possible. The value must not appear on vendor cards or ordinary communications copy.

## Prohibited measurements and money

Hunt for chest, waist, hip, dress size, shoe size, height, weight, biometric, card, bank, receipt, balance or amount fields. Any presence is a BLOCKER.

## Vendor least privilege

Vendor session cookie must be distinct from `md_event_os_session`. Staff navigation must not appear. No unrestricted guest dossier, dietary notes, RSVP form or attendance control. Attempting to open `/app` with only the vendor cookie must require staff sign-in.

## Forged and cross-event / cross-vendor negatives

- Forged event merchandise URL → not available / not found.
- Planner on Alpha Two merchandise → assignment denial or empty out-of-scope state.
- Forged vendor token → `/vendor/unavailable`.
- Other-vendor token must not show Alpha One fulfilments such as Adéwálé.
- Unauthenticated `/app/.../merchandise` → sign-in.
- Vendor cookie on `/app` → sign-in.

## Optimistic concurrency and double-submit

Submit the same vendor milestone twice quickly. One logical success. A stale `expectedFulfilmentVersion` after another session edits must show conflict, not silent overwrite.

## Revocation and session expiry

End the vendor session. Confirm unavailable. A staff session must not reopen `/vendor` as the vendor.

## Persistence

Reload merchandise after CEO exception and vendor update. Sign out and sign in as CEO. Records remain. Guest sign-out/sign-in keeps RSVP independent of merchandise choice.

## Responsive and zoom

360px, 768px, desktop and 200% zoom (or 720px layout equivalent). No document-level horizontal overflow. Long Yorùbá names (Bàbátúndé, Ọmọ́tọ́lá, Olúfẹ́mi) wrap by word, not `break-all`. Tables/cards remain readable.

## Keyboard, focus, contrast, reduced motion, axe

Keyboard-only: merchandise sections, collection save (CEO), vendor submit, guest choice. Visible focus. Enabled controls `pointer`; disabled `not-allowed`. Reduced motion: no decorative motion required. Run axe on merchandise, vendor and ACA-S04C. Serious/critical axe issues are MAJOR or BLOCKER.

## Academy

Open ACA-S04C. Distinction ≥90, pass 80–89, retake <80. Submit an attempt. Completion copy must state training evidence only and must not grant operational authority, vendor contact rights or production approval.

## Evidence format

For each check record:

- URL
- Role / session
- Action
- Expected
- Observed
- Screenshot only where a defect needs proof
- `PASS` / `FAIL`

End with one verdict: `READY` / `NOT READY` / `BLOCKED`.

Claude verifies. Claude does not accept EOS-S04C.
