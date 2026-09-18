# Rebuild baseline

These rules bind every Event OS rebuild slice.

1. CEO-approved specifications are the product authority.
2. Cursor is the implementation lead.
3. Cursor may not narrow, replace, defer, or reinterpret a requirement silently.
4. Any conflict or ambiguity requires a written decision request.
5. Every requirement must trace to implementation, an automated test, a deployed browser journey, persistence evidence, and audit evidence where applicable.
6. No slice is accepted from code or tests alone.
7. Cursor provides technical certification.
8. The reviewing CTO provides findings and recommendations.
9. Only the CEO grants final acceptance.
10. Legacy code is evidence only and carries no presumption of correctness.
11. New work must start from the genuine S01 specification recovered from the legacy branch `legacy/event-os-s01-s06a-pre-rebuild`.
12. No AI-generated wrapper may supersede the approved specification without explicit CEO approval.
13. `productionAuthorised` remains false until explicitly changed by the CEO.
14. New slices must be built and browser-validated sequentially.

The archived implementation did not conform fully to the approved slice specifications. It is preserved for evidence, rollback, and selective reference only. See `LEGACY_RECOVERY_MANIFEST.md`.
