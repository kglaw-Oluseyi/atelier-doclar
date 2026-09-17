# Milestone 6B — Preflight

UTC: 2026-09-17T12:59:27Z

## Git / GitHub
- Branch: main
- Local HEAD: `0844e78c8c897447de8eb88687e906f104bf5fd3`
- origin/main: `0844e78c8c897447de8eb88687e906f104bf5fd3`
- GitHub main: `0844e78c8c897447de8eb88687e906f104bf5fd3`
- left-right origin/main...HEAD: 0 0
- origin/main ancestor of HEAD: YES
- Worker source ancestor bbec476…: YES
- CTO security evidence ee02c280…: YES
- Security acceptance expiry: 2026-10-17T23:59:59Z (valid at preflight)
- Publication allowlist: empty (no unpublished intended commits)
- Dirty/untracked CAP1000, qualification, debug, Untitled paths: present locally; **excluded** from publication

## Railway identities
- Project: atelier-doclar / c1c937b7-2660-4fc2-8257-c08bd6346658
- Environment: production / 6d70f804-d3c7-4255-88c3-cc86531251ef
- Event OS service: 31c25514-ef57-43c6-97ff-49fc6dd367c5
- Postgres service: 5d86579b-6b66-4178-96b8-b66e1f7755a3
- Control Tower service: 17dfb657-71ee-451b-acff-c3f0a18067b2 (**untouched**)
- Public domain: https://event-os-production-bc8d.up.railway.app
- Active Event OS deployment: fde04a5f-4227-42b3-84bc-355e9541f0f1
- Active deployment source commit: df6d6a616ccf769e86020a94c0f5281002137292
- EVENT_OS_GIT_SHA (application identity): d30643ca5ad347014d3a9a9457f2228783916540
- Autodeploy (explicit, 3 reads): enabled=false
- Watch patterns: /__CONTROLLED_DEPLOY_ONLY__/**
- GitHub deployment trigger for event-os: absent (trigger exists only for control-tower)
- Queued/building deployments: none (latest SUCCESS)
- Solver-worker service: absent
- productionAuthorised: false
- Providers/adapters: INACTIVE
- Health live: HTTP 200 alive
- Health ready: ready=true persistence=POSTGRES migrationStatus=APPLIED fixtures=true

## Recovery point
- Method: Railway volumeInstanceBackupCreate
- Backup id: `309b3b18-1413-4be3-887f-6c1a41a40e78`
- Name: m6b-pre-migrate-011-016-20260917
- CreatedAt: 2026-09-17T12:56:38.384Z
- Volume instance: ca450a7c-ac33-4a23-856a-d3e0bfb66e23 (postgres-volume / Postgres)
- referencedMB: 1172 (non-empty)
- expiresAt: null (manual retention until deleted)
- PITR: disabled on plan; volume backup used instead
- Restore: GraphQL `volumeInstanceBackupRestore(volumeInstanceId, volumeInstanceBackupId)` then redeploy Postgres/Event OS as required

## Migration ledger (pre-deploy)
Applied: 001–010 only. Pending at deploy time: 011–016.

## Variable names (Event OS; values redacted)
DATABASE_URL, EVENT_OS_ACCESS_TOKEN, EVENT_OS_ALLOW_FIXTURES, EVENT_OS_ATELIER_LINK_PEPPER, EVENT_OS_ATELIER_SESSION_SECRET, EVENT_OS_COOKIE_SECURE, EVENT_OS_DOCS_HEAD, EVENT_OS_GIT_SHA, EVENT_OS_LAYOUT_ASSET_*, EVENT_OS_RSVP_*, EVENT_OS_SESSION_*, EVENT_OS_VENDOR_*, NODE_ENV, RAILPACK_*, RAILWAY_*

## Security recheck
- Dockerfile / worker / OR-Tools / hashes unchanged vs bbec476
- Base digest: python:3.12.14-slim-trixie@sha256:2fe5997d249a808b8eeea52c58a1dbffbba28754dc11699ef5c029f2d818ce79
- Pins: Node 20.19.0, OR-Tools 9.15.6755, UID 10001, HEALTHCHECK NONE, no EXPOSE
- Focused test cpsat-m5-authority-packaging: 10/10 pass
