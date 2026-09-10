# EOS-S05B Migration Deployment and Production Configuration

**Status:** CEO review draft

## Persistence

Add replay-safe forward-only migrations. Store documents in private object storage and metadata/editions/decisions in Postgres. Do not serialize the new domain as a single opaque JSON blob where durable querying, constraints or concurrency are required.

## Migration rules

- Additive schema first; no destructive reset or down-migration.
- Stable organisation/event foreign keys and database constraints.
- Backfills derive only from authoritative existing data and write receipts.
- Unknown legacy state remains unknown.
- Migrations are idempotent and tested against empty, fixture and upgraded snapshots.

## Deployment policy

Once separately authorised and complete: focused tests, full typecheck, shared-platform and Event OS tests, programme validation, Event OS build, `git diff --check`, browser journeys, commit/push, GitHub parity, Event OS-only Railway deploy, deployed-SHA/readiness verification and live synthetic smoke. Control Tower deploys only if its executable code changes.

## Runtime variables

Final implementation report must list exact names, service, secret status and purpose. Likely groups include private risk-document bucket binding, malware/OCR adapter selection and outbound integration enable flags. Do not ask George for non-secret values Cursor can set. Never activate external effects without separate authority.

## Recovery

Application rollback must tolerate additive tables/columns. Forward recovery is preferred. Existing immutable evidence remains. Never delete Postgres data or bucket objects to make a test pass.

## Production gate

`productionAuthorised:false` remains. Real vendors, policies, contracts, incidents and clients remain prohibited until separate onboarding, identity, retention, legal and provider controls are accepted.

