# Deployment and Production-Realism Policy

**Authority:** George Lawson, CEO, Maison Doclar  
**Date:** 6 September 2026  
**Repository:** `kglaw-Oluseyi/atelier-doclar`  
**Railway project:** `atelier-doclar` only  
**Status:** CONTROLLING — supersedes earlier general “do not push / do not deploy” restrictions  
**Not:** production operations authorisation, a protected-gate signature, or permission to use real client data

Verified Maison Doclar implementation work is committed, pushed to GitHub and deployed to the affected Railway service by default. Development uses the real frontend, backend, database, migrations and runtime architecture with clearly synthetic data. Deployment does not itself authorise real client operations. Only public/client access, real personal data and actions with external consequences remain gated.

## Supersession

This CEO decision supersedes earlier general instructions stating:

- do not push;
- do not deploy;
- Railway must remain untouched;
- production deployment requires slice acceptance;
- frontend/backend work must remain local pending routine review.

Historical records that documented those restrictions stay in place as history. They are not current execution stops. A restriction tied to a specific known danger remains only when its reason is still valid and is explicitly documented below.

## Normal implementation workflow

For every meaningful slice:

1. Inspect controlling requirements.
2. Implement the complete vertical capability.
3. Run focused tests.
4. Run the appropriate comprehensive verification gate.
5. Commit focused changes.
6. Push to GitHub (`kglaw-Oluseyi/atelier-doclar`, ordinary non-force push).
7. Verify local / GitHub parity.
8. Deploy every affected service in Railway project `atelier-doclar`.
9. Verify health, migrations and deployed SHA.
10. Test the deployed frontend and backend.
11. Perform human-simulated browser verification at meaningful visual or journey milestones.
12. Record acceptance separately.

Do not stop at routine package boundaries. Do not request separate permission for an ordinary non-force GitHub push or deployment to an existing `atelier-doclar` service after verification succeeds.

Stop only for a material blocker, unsafe divergence, destructive migration, missing credential, external consequence, or genuine CEO decision.

## Standing-authorised after applicable checks

Within this repository and Railway project `atelier-doclar`:

- ordinary commits;
- ordinary non-force pushes to `main`;
- deployment of affected services;
- production builds;
- safe database migrations;
- synthetic fixture creation;
- synthetic test-event creation;
- deployed browser testing;
- frontend/backend integration testing;
- service health checks;
- restart-survival testing;
- controlled synthetic-data cleanup;
- logs and deployment inspection;
- rollback of a failed deployment to a known-good application version.

## Safeguards that remain

These still require explicit authority or an already ratified programme rule:

- admitting real clients or guests;
- storing real personal or biometric data;
- sending real email, WhatsApp, SMS or notifications;
- charging or transferring real money;
- activating live payment providers;
- sending provider bookings or operational instructions;
- enabling production biometric recognition;
- making the application publicly accessible beyond the authorised audience;
- deleting or rewriting Git history;
- force-pushing;
- destructive database resets;
- dropping production tables or data;
- accessing another repository or Railway project;
- signing protected CEO, specialist, venue or production gates;
- accepting unresolved security, privacy or data-integrity risk.

External integrations use sandbox, test or no-send modes until specifically activated.

## Meaning of `productionAuthorised`

Retain `productionAuthorised: false` until Maison Doclar authorises real operational use.

It must not block deployment, synthetic-data workflows, production builds, Railway Postgres, real migrations, deployed frontend/backend testing, role and permission testing, restart-survival testing, or CEO visual review.

It blocks only capabilities the system defines as requiring real operational authorisation. It is not a reason to keep the application in memory-only mode.

## Production-realistic persistence

In-memory persistence is not an acceptable final deployed backend for Event OS.

Event OS on Railway project `atelier-doclar` reads and writes through Postgres. Schema migrations run through the repository’s controlled mechanism. Synthetic fixtures are deterministic, marked, and idempotent. Data survives restart and redeployment. Optimistic concurrency and atomic transactions remain enforced. Event and tenant isolation remain enforced. Failed migrations fail closed. Health readiness reports the truthful persistence mode. `MEMORY_NON_PRODUCTION` must not be claimed as production-realistic persistence.

No secrets appear in Git, logs or reports. No real client or guest information is introduced.

## Synthetic-data lifecycle

Synthetic data may remain in the deployed database throughout development. Identities and events must be unmistakably synthetic. Real contact details and real communications are forbidden. Seed ownership is deterministic, versioned and idempotent. Synthetic records stay separable from future client data. Cleanup requires preview/dry-run, explicit confirmation before destructive execution, and an audit record of final pre-client cleanup.

## Deployment verification

Every affected-service deployment verifies deployment status, deployed GitHub SHA, service health, database readiness, migration status, expected routes, a representative authenticated journey, and the absence of obvious runtime, asset and console failures.

Deploy only affected services. Record skipped watch-pattern events accurately; a skipped service was not deployed.

## Frontend visibility

Primary navigation, menus, tabs, forms, dashboards and complete user journeys are implemented and reviewed in their intended live composition. A passing build is not evidence of visual quality.

## Cost-effective review

Use milestone-based review. Do not stop for arbitrary prompt boundaries, routine commits, minor styling corrections, or isolated low-risk observations. Immediate remediation remains required for security, privacy, data integrity, cross-event leakage, destructive migration, false success, server/client authority failure, material accessibility failure, and unrecoverable deployment failure.

## Scope

This policy applies only to GitHub repository `kglaw-Oluseyi/atelier-doclar` and Railway project `atelier-doclar`.
