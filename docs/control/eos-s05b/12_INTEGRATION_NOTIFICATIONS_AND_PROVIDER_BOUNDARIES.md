# EOS-S05B Integration Notifications and Provider Boundaries

**Status:** CEO review draft

## Provider-neutral ports

Define ports for private document storage, malware scanning, OCR/extraction, source monitoring, communications outbox and optional insurer/broker data exchange. Domain code depends on ports, not Cloudflare, Brevo, Twilio or a named AI vendor.

## Communications

Risk workflows create governed communication intents only. Each intent carries recipient identity, purpose, channel preference, template edition, variables, event scope, evidence, earliest send time and approval state. Existing communications authority decides dispatch. No reminder is sent merely because a checkpoint becomes due.

## Outbound effects

Use an outbox with stable effect keys, attempt receipts, provider correlation, retry classification and honest states: `NOT_REQUESTED`, `PENDING_APPROVAL`, `QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `CANCELLED`. A queued provider call is not delivered.

## Configuration readiness

Each adapter reports `INACTIVE`, `MISCONFIGURED`, `READY` or `DEGRADED`. Health must not claim ready from a compile-time flag when runtime binding is absent. Secrets stay in Railway variables and never enter prompts, logs, screenshots or evidence.

## Initial slice posture

Document store may be activated if already governed. Malware scanning, OCR, source monitoring, communications and external insurance integrations default inactive. Fixture adapters support synthetic verification and are unmistakably non-production.

