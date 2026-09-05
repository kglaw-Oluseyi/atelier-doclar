# ADR — Production persistence for the Control Tower

**Status:** Recommended engineering approach; provider not provisioned  
**Slice:** MD-FC1  
**Related:** `CT2-OI-001` — `PRODUCTION_DECISION_REQUIRED`

## Context

`ProgrammeStore` is the executable contract: append-only events, idempotency keys, optimistic concurrency, immutable snapshots. Memory and filesystem JSONL adapters are explicitly `NON_PRODUCTION`. Process-local audit was Foundation technical debt and is now a file/memory `AuditRepository`. Live deployment still needs a durable production adapter.

## Recommendation

**PostgreSQL** behind the existing `ProgrammeStore` and `AuditRepository` contracts.

Reasons:

- Fits Railway (`atelier-doclar`) as a single managed plugin without a new vendor estate.
- Append-only event log maps to an `events` table with unique `(event_id)` and `(idempotency_key)`.
- Optimistic concurrency maps to `aggregate_revision` compare-and-append.
- Snapshots are insert-only rows; overwrite is rejected.
- Audit durability uses the same database, not a second product.
- Backup/restore is `pg_dump` / point-in-time recovery, aligning with `docs/control/BACKUP_RESTORE.md`.

## Adapter architecture

1. Keep `ProgrammeStore` as the only domain persistence API.
2. Add `PostgresProgrammeStore` implementing the same append/list/snapshot methods.
3. Map `AuditRepository.append` to an append-only `audit_entries` table (unique `id`).
4. Local tests continue to use Memory/Filesystem adapters. Production infrastructure is not required to test Foundation behaviour.

## Migration

Start from an empty schema. Replay corpus seed events, then live webhook/reconcile events. Do not rewrite historical Git commits. JSONL files under `PROGRAMME_DATA_DIR` are import sources, not the production system of record.

## Concurrency, idempotency, audit

- Unique constraints enforce idempotency and snapshot immutability.
- `expectedRevision` remains compare-and-append.
- Corrections are new events, never destructive updates.

## Security

- Credentials only via environment / Railway variables.
- Least privilege: application role can INSERT events/audit/snapshots and SELECT; no DELETE on event or audit tables.
- No secrets in the repository.

## Decision required

CEO/operator must still approve provisioning PostgreSQL on Railway. MD-FC1 does not select a commercial vendor contract beyond this engineering recommendation and does not provision it.

**Classification:** `PRODUCTION_DECISION_REQUIRED`
