# EOS-S04C final focused Claude-in-Chrome verification

**Authority:** `MD-PR-S020`. Claude verifies. Claude does not accept EOS-S04C.  
**Mode:** Final focused verification of vendor access and guest/vendor lifecycle concurrency only.  
**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
**Visual language:** Command Atelier. Functional light-surface accent `#8B6E38`.

Do not start EOS-S04D, EOS-S04E, EOS-S04F or EOS-S05.  
Do not repeat staff collection/item/offer, cap consent, Academy, or responsive journeys.  
Do not collect payments. Do not send email, WhatsApp or SMS.

## 1. Deployment gate

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `identityAdapter`, `productionAuthorised`.
3. `deployedSha` must equal `origin/main` of `kglaw-Oluseyi/atelier-doclar`.
4. Persistence must be `POSTGRES`. Migrations must be applied. `productionAuthorised` must be false. Identity adapter must be `NON_PRODUCTION_FIXTURE`.
5. If any gate fails, verdict is `BLOCKED`.

Merchandise workspace: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/merchandise`

Staff token: Railway `EVENT_OS_ACCESS_TOKEN`. Do not paste the secret into evidence.

| Role | Email |
|------|-------|
| CEO | `ceo@maison-doclar.test` |
| Event Director | `director@maison-doclar.test` |

Use separate browser contexts for staff, guest (`/offers`) and vendor (`/vendor`). Hidden controls are not server enforcement. Synthetic banners must remain visible.

The historical Aso-Oke House revocation is truthful. Do not ask for it to be un-revoked. Do not use a previously revoked token as a success path.

## 2. Create a dedicated synthetic vendor assignment

As CEO or Event Director, create a **new** dedicated synthetic verification vendor (do not reuse the revoked Aso-Oke House row). Assign event/collection/item scope, set a future expiry, and save. Confirm the UI status is truthful (`not issued` until a usable link is presented; then `active` / `renewed` / `expiring` / `expired` / `revoked` / `unavailable` as applicable). Do not label ready unless the currently presented issuance result is usable.

## 3. Issue and open a vendor session

Issue access. Open or copy the synthetic `/vendor` link in a separate context. Confirm a usable assigned vendor portal. Staff tokens must not open it.

## 4. Renew and prove previous access is invalid

Renew with a new expiry. Confirm the new link works. In the already-open previous vendor context, reload or continue: previous access must fail closed. Status must show renewed/superseded truthfully.

## 5. Revoke and prove the already-open session loses access

Open the current usable link. Revoke from staff. Reload the already-open vendor session. It must lose access. The revoked token must remain invalid.

## 6. Vendor least privilege

Vendor sees assigned fulfilments only. No full guest directory, unrestricted dossier, RSVP, invitation, party, credential or attendance mutation. Cap inches only if required for assigned fulfilment.

## 7. Cross-event / cross-vendor forged denial

Forged tokens, cross-event identifiers and cross-vendor identifiers fail closed without protected-data flash. Raw tokens must not appear in ordinary projections or audit copy.

## 8. Guest renewal identical double-submit

On private guest access, submit an identical renewal twice in rapid succession (double-click or two overlapping submits). Durable result must be one renewal, one active grant, one success. No second usable token.

## 9. Guest renewal stale different-value conflict

After a successful guest renewal, replay a stale form with a **different** expiry and the previous version. Expect a visible `role="alert"` conflict. Data must not change. Retry without reload is not safe. Reload, then the durable renewal remains the one already saved.

## 10. Vendor renewal identical double-submit

Repeat step 8 for vendor renewal. One logical mutation. One version increment. One active assignment.

## 11. Vendor renewal stale different-value conflict

Repeat step 9 for vendor renewal. `VERSION_CONFLICT`. Reload required. Prior durable renewal unchanged.

## 12. Revocation race where safely testable

If a vendor fulfilment update can be attempted against an assignment that is being revoked, the revoked vendor must not complete a later fulfilment mutation. The loser fails closed. No partial update may survive. If a true parallel race cannot be forced in the browser, record that limitation and confirm sequential revoke-then-update fails closed.

## 13. Audit truth and token secrecy

Inspect staff-visible audit/status copy after issue, renew and revoke. Reasons and status must be truthful. Raw token values must not appear. The historical Aso-Oke House revocation remains recorded. Rotate verification HMAC/session secrets before any protected real-production or identity-adapter transition; do not treat them as permanent provider credentials.

## Verdict language

Claude verifies. Claude does not accept EOS-S04C.  
EOS-S04D–F and EOS-S05 remain untouched.
