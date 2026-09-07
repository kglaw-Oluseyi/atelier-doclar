# EOS-S04F Claude-in-Chrome — whole-slice independent verification

**Authority:** `MD-PR-S026`. Claude verifies. Claude does not accept EOS-S04F.  
**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
**Visual language:** staff Command Atelier; host Atelier may use quieter editorial composition and decorative metal `#B79F85`. Functional light-surface accent remains `#8B6E38`.

Do not start EOS-S05. Do not use real host, client or guest data. Do not send communications, invoke a translation provider, invoke an email/WhatsApp/SMS provider, approve by AI, or collect payments.

## Deployment gate

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `live`, `productionAuthorised`.
3. Compare `deployedSha` to `origin/main` of `kglaw-Oluseyi/atelier-doclar` after the MD-PR-S026 push.
4. Open `https://event-os-production-bc8d.up.railway.app/api/health/live`.
5. If SHA differs, persistence is not `POSTGRES`, migrations are not applied, `ready` is false, or `productionAuthorised` is true, verdict is `BLOCKED`.

Starting baseline: `2663f4363ad311f486f05c70e8e8411d5e9830bb`.  
Ending SHA: the live `deployedSha` after the S04F Event OS deploy (must equal `origin/main`).

Confirm migration `EOS-S04F-LANGUAGE-V1` is applied. Confirm that no translation-provider environment variables were added. Do not print, copy or screenshot secret values. Do not modify existing Atelier/vendor secrets. Do not deploy Control Tower.

## Identities (synthetic only)

Staff access token: Railway variable `EVENT_OS_ACCESS_TOKEN` on service `event-os`. Do not paste the secret into evidence.

| Role | Email |
|------|-------|
| CEO | `ceo@maison-doclar.test` |
| Event Director | `director@maison-doclar.test` |
| Planner | `planner@maison-doclar.test` |
| Auditor | `auditor@maison-doclar.test` |
| System Administrator | `admin@maison-doclar.test` |

| Record | ID |
|--------|----|
| Alpha One | `00000000-0000-4000-8000-000000000021` |
| Olúfẹ́mi Alákíjà | `00000000-0000-4000-8000-000000000073` — explicit Yorùbá preference |
| Ẹ̀bùnolúwa | `00000000-0000-4000-8000-000000000072` — no preference supplied |
| Cultural greeting | `Ẹ kú àbọ̀` — synthetic, unvalidated |

URLs:

- Sign-in: `https://event-os-production-bc8d.up.railway.app/sign-in`
- Event hub: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021`
- Language workspace: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/language`
- Staff Atelier: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/atelier`
- Academy: `https://event-os-production-bc8d.up.railway.app/app/academy/ACA-S04F`
- Academy alias: `https://event-os-production-bc8d.up.railway.app/app/academy/aca-s04f`

## Premium visual quality

Staff workspace must remain Command Atelier. Language must be visible as names and codes, never as flags. Source and translation must keep a clear visual relationship. Enabled controls use a pointer cursor. Disabled controls use `not-allowed`. Do not treat a generic spreadsheet translation grid as the whole experience.

## Explicit preference and no inference

Sign in as Event Director. Open Alpha One → Language and editions.

1. Confirm Olúfẹ́mi shows an explicit Yorùbá preference.
2. Confirm at least one guest shows “No preference supplied”. That unknown must not be stored or displayed as English consent.
3. Confirm Yorùbá diacritics survive reload: `Ẹ̀`, `Ọ́`, `ṣ`, `ń`, `Ẹ kú àbọ̀`, `Olúfẹ́mi Alákíjà`.
4. Do not infer language from name, surname, title, household, party, nationality, address or phone country code. There is no UI that invents a preference from those fields.

Correct a preference if the form is available. The history section must record the previous unknown-or-set value, the next value, and the reason. A preference change must not alter RSVP.

## Translation lineage and cultural provenance

1. Cultural source `Ẹ kú àbọ̀` must be labelled synthetic and unvalidated. Do not treat fixture copy as culturally authoritative.
2. Open the translation workspace. Source remains first. Target sits beside it on desktop and beneath it on a narrow viewport.
3. Confirm a Yorùbá edition is marked Partial and a French edition is complete/approved.
4. Confirm German long compound `Willkommensveranstaltungseinladung` and Simplified Chinese `欢迎光临` render without stripping or “correction”.
5. Draft Igbo or any unapproved edition must not be presented as approved recipient content.

## Maker/checker

1. As Event Director, approve is available for draft translations the director did not author.
2. Sign in as Planner. Planner may coordinate drafts. Planner must not be able to approve their own consequential translation or cultural text.
3. Sign in as Auditor. Auditor can view. Approve and Save preference buttons must be absent.
4. Sign in as System Administrator if that fixture user is available. Sysadmin must not receive linguistic business authority by default.

Self-approval must fail closed. Stale approval after a source change must fail closed.

## Partial versus complete coverage and fallback

1. Coverage must distinguish partial from complete. A mixed edition must not claim completeness.
2. Fallback, where used, must be labelled for staff with a reason. Terminal fallback is `en-GB` approved content only.
3. Draft or unapproved text must never appear as the selected recipient language.
4. The explicit Yorùbá preference must not be overwritten by fallback. Fallback may supply a missing approved unit; it must not rewrite the stored preference.

## Placeholders and injection

If a translation form is used, unknown or missing placeholders must be rejected. `{{guestName}}` identity must stay the same across languages. Do not execute raw template script. Personal names must not be translated or transliterated unless already governed.

## Recipient assembly and no dispatch

1. Open Recipient assembly preview.
2. Confirm the seeded Olúfẹ́mi assembly says ready for governed communications review and not dispatched.
3. Assemble a preview if the form is available. The result must name one `guestId`, the requested language, the selected language, fallback used yes/no, and approval status.
4. Confirm no email, WhatsApp, SMS or translation-provider call occurred. Success copy must not claim delivered.
5. Unnamed allowance is not a recipient. Household or party must not substitute for the guest.

## Privacy and roles

Language preference is personal data and event-scoped. Do not expect a preference from Alpha One to appear on another event. Reviewer notes and cultural provenance stay off recipient-facing host copy unless the host edition is the intended published text. Hidden controls are not enforcement: Auditor and Planner restrictions must hold after a direct URL visit.

## Host multilingual edition

From staff Atelier, issue a principal host invitation in a separate browser context. Confirm the EDITIONS chapter can show the approved host-facing French edition, labelled synthetic and unvalidated. Host view must not dispatch, approve a campaign, or expose staff reviewer notes.

## Responsive / accessibility

Check the language workspace at 360px, 768px, desktop and 200%-equivalent zoom. Confirm:

- no document-level horizontal overflow;
- visible focus;
- keyboard-only review/approval where the role permits;
- `lang` attributes on Yorùbá, French, German and Chinese text;
- screen-reader-readable coverage and fallback labels;
- no flag-only language identification;
- no serious/critical axe violations.

## ACA-S04F

Open `/app/academy/ACA-S04F` and the `aca-s04f` alias. Confirm the course is registered, thresholds remain distinction ≥90 / pass 80–89 / retake below 80, and completion copy states that training evidence grants no linguistic approval, role, campaign authority, provider access, gate signature or production authorisation.

## Verdict

Record PASS / PASS WITH OBSERVATIONS / BLOCKED. Claude verifies. Claude does not accept EOS-S04F.
