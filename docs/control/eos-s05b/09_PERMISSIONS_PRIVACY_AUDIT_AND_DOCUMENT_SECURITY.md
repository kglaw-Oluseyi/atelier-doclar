# EOS-S05B Permissions Privacy Audit and Document Security

**Status:** CEO review draft

## Capability permissions

Minimum permissions: `risk.catalogue.view/manage`, `risk.rule.review/approve`, `risk.policy.view/manage/verify`, `risk.event.view/manage/decide`, `risk.vendor.view/assess/decide`, `risk.clause.view/draft/legalReview/commercialApprove`, `risk.continuity.view/manage/authorise`, `risk.incident.view/report/command/close`, `risk.reserve.request/authorise`, `risk.dossier.view/approve/publish`, `risk.export`, `risk.audit.view`.

System Administrator has configuration authority only. It gains no implicit business, legal, spatial or financial authority. CEO organisation-wide visibility is permission-governed and does not bypass event/client confidentiality.

## Maker/checker matrix

Distinct people are required for policy verification, material residual-risk acceptance, clause approval, vendor restriction/decline, fallback authorisation, reserve authorisation, incident closure with residual actions, and dossier publication. The maker cannot decide their own edition.

## Document protection

- Private object store; authenticated proxy; `Cache-Control: private, no-store`.
- Object keys and storage identifiers never enter normal projections.
- Projection-specific exports cannot be reused by a less-privileged assignment.
- Access is checked at retrieval time, not just link generation.
- Sensitive claim, medical, personnel, bank and legal-advice fields are separately classified.
- Downloads use safe content disposition and inert previews.

## Audit

Append-only audit names the human actor in usable, permission-safe form—not UUID-only oversight. Record action, subject, scope, decision, reason, before/after edition IDs, correlation, idempotency application, external-effect status and denied attempts.

## Retention and subject rights

Retention classes are explicit by record type and legal hold. Deletion requests produce a governed workflow; they never destroy audit or contractual records without authorised basis. Exports redact personal and privileged material by projection policy.

