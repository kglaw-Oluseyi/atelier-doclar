# EOS-S04C final vendor-access and lifecycle-concurrency remediation

**Slice:** `EOS-S04C`  
**Prompt Control ID:** `MD-PR-S020`  
**Status:** `IN_REVIEW / NOT READY`  
**Starting baseline:** `3854405c3cf4aa6d387e0bd1cc066166c8feca50`  
**Catalogue slice:** no  
**Production:** unauthorised  

Claude’s focused re-verification of the primary-journey batch found two remaining blockers:

1. Vendor assignment mint/renew failed in the hosted synthetic environment with `PRODUCTION_ADAPTER_FORBIDDEN` plus `synthetic vendor secrets cannot be used in production`.
2. Guest and vendor access renewal accepted stale different-value requests and processed rapid identical double-submits twice.

This batch remediates only those defects. Staff collection/item/offer, direct guest-access issuance, cap-consent, RSVP/attendance/payment independence, Academy, and Command Atelier are not reopened. EOS-S04D–F and EOS-S05 remain untouched.

## Environment classification

A production-built Railway runtime (`NODE_ENV=production`, Postgres `productionStatus=PRODUCTION`) may host **synthetic verification**. It is not **production authorised**.

Synthetic vendor access is permitted only when all of the following hold:

- `productionAuthorised === false`
- identity adapter is explicitly `NON_PRODUCTION_FIXTURE`
- Railway project name is exactly `atelier-doclar`
- `EVENT_OS_VENDOR_PEPPER` and `EVENT_OS_VENDOR_SESSION_SECRET` are configured, at least 32 characters, and are not known fixture-default literals
- the record is synthetic / non-production

The application no longer treats `store.productionStatus === PRODUCTION` or `NODE_ENV === "production"` as production-authorised for vendor/guest/staff secret policy.

When `productionAuthorised === true`:

- fixture identities and synthetic fallback secrets are rejected
- permanent identity/provider configuration is required
- existing synthetic sessions must not be treated as production sessions

These HMAC/session values are verification-environment secrets. They must be rotated before any protected real-production gate or identity-adapter transition. They are not permanent provider credentials.

## Lifecycle CAS and idempotency

Guest and vendor issue, renew, and revoke mutations:

- observe the caller’s optimistic version at the durable persistence boundary (`UPDATE … WHERE version=$8`)
- return `VERSION_CONFLICT` for a stale different-value request, with no partial access row, no success audit, and a visible conflict that requires reload
- treat an already-applied identical request (including a different idempotency key) as replay: one logical mutation, one version increment, one active/superseding grant, one success audit, no second token
- check vendor assignment authority transactionally on fulfilment updates; a persisted revocation wins against a stale vendor write; the loser fails closed

Client-side lifecycle forms lock on submit. That is UX only and is not the enforcement.

## Synthetic vendor path

Claude’s revocation of synthetic Aso-Oke House access is retained. This batch does not un-revoke that row, rewrite audit, or patch Postgres by hand. After deploy, create a **new dedicated synthetic verification assignment** from the merchandise studio. The revoked token remains invalid.

## Railway secrets

`EVENT_OS_VENDOR_PEPPER` and `EVENT_OS_VENDOR_SESSION_SECRET` are set only on Railway project `atelier-doclar`, service `event-os`. Values are never logged, committed, or returned. Presence is confirmed by name/status or non-reversible fingerprint only.

EOS-S04C remains `IN_REVIEW / NOT READY`. Claude verifies. Claude does not accept.
