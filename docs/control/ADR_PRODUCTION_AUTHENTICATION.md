# ADR — Production authentication for `/programme`

**Status:** Recommended approach; identity vendor not bound  
**Slice:** MD-FC1  
**Related:** `CT4-OI-001` — `PRODUCTION_DECISION_REQUIRED`

## Context

Development uses a named-actor form plus a shared access token and an HMAC httpOnly cookie (`md_programme_session`). That is acceptable for local and CI. It is not a production IdP.

Protected approvals remain a separate authority path. Login must never mint CEO, independent, specialist or live-event approval.

## Requirements

- Private `/programme`
- Named human identity (no Cursor / UNKNOWN / SYSTEM actor)
- Role support: executive, reviewer, implementer, reader
- Least privilege
- Secure session (httpOnly, signed, expiring)
- Revocation
- Audit identity equals the named human
- Protected approvals remain separately authorised

## Recommendation

Do **not** bind Auth.js, Clerk, Auth0 or another vendor in this slice. No current programme evidence selects one.

Recommended production approach when CEO authorises it:

1. Keep the existing session cookie as the application session after authentication.
2. Replace the shared access token with a named identity source the CEO selects (organisation IdP or Railway-compatible OIDC).
3. Map IdP subject → `actorId` + `TowerRole`.
4. Revoke by session-secret rotation and/or an explicit denylist in durable storage.
5. Continue to reject Control Tower self-approval of protected gates.

Until that decision, production must fail closed if only synthetic `*-not-for-production` secrets are present.

## Decision required

CEO selects the identity provider and named operators. Cursor cannot be an actor.

**Classification:** `PRODUCTION_DECISION_REQUIRED`
