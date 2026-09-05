# ADR — FaceGate is return-recognition support only

## Decision

Initial check-in and attendance creation require an authorised human. Optional biometric enrolment occurs only after that check-in and affirmative consent. A later FaceGate match yields a signed, short-lived candidate assertion. Event OS validates current attendance, consent, access, revocation and safeguarding state; an authorised operator records `ADMIT`, `REFER` or `DENY`.

## Consequences

- No FaceGate identity has permission to call initial check-in or attendance mutation endpoints.
- No gate opens automatically from a match.
- QR and supervised manual return paths are equivalent and always available.
- Templates are event-scoped by default and isolated from the operational ledger.
- Missing/expired/replayed/low-confidence assertions produce referral, never admission.

