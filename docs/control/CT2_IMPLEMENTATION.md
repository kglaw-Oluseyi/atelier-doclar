# CT2 Implementation — Events, snapshots and status calculator

**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0003`  
**Native ID:** `CT2`  
**Slice ID:** `MD-CT2`  
**Status:** `IN_REVIEW`  
**Baseline:** `f9c1db0ba0068f0bf19e65844f168e90185a9b50`

This slice implements immutable programme events, projections, versioned snapshots and evidence-derived status. It does not implement UI, ingestion, auth, or a production database.

## Package

CT2 extends `@maison-doclar/programme-domain`. No product/application package was created.

| Item | Path |
|------|------|
| Event envelope and types | `packages/programme-domain/src/events.ts` |
| Store contract + adapters | `packages/programme-domain/src/store.ts` |
| Projector | `packages/programme-domain/src/projector.ts` |
| Status calculator | `packages/programme-domain/src/status.ts` |
| Outstanding work | `packages/programme-domain/src/outstanding.ts` |
| Snapshots | `packages/programme-domain/src/snapshot.ts` |
| Engine | `packages/programme-domain/src/engine.ts` |
| Corpus seed | `packages/programme-domain/src/seed.ts` |

## Persistence law

**Domain persistence contract ≠ production database decision.**

`ProgrammeStore` is the contract. `MemoryProgrammeStore` and `FilesystemProgrammeStore` are `NON_PRODUCTION` local adapters. PostgreSQL remains unselected.

## Commands

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm programme:validate
pnpm programme:project
```

## Event envelope

`eventId`, `eventType`, `schemaVersion`, `aggregateType`, `aggregateId`, `product`, `sliceId`, `occurredAt`, `recordedAt`, `actor`, `source`, `payload`, `idempotencyKey`, optional `expectedRevision` / `causationId` / `correlationId`.

Idempotency: same key or event identity returns `duplicate` and does not increment revision.

Concurrency: expected-revision optimistic compare-and-append. Stale writers fail with `STALE_REVISION`.

## Status rules

Derived, never manually overridden.

1. Explicit supersession event → `SUPERSEDED`
2. Open blocking item → `BLOCKED`
3. CT1 acceptance invariant + accepted predecessors/gates → `ACCEPTED`
4. Review requested + implementation evidence → `IN_REVIEW`
5. Implementation evidence → `IN_PROGRESS`
6. Predecessors accepted/approved → `READY`
7. Otherwise → `NOT_STARTED`

`ACCEPTED_RISK` is not `RESOLVED`. Version numbers do not supersede.

## Percentage

`accepted mandatory slice weight / total mandatory slice weight` only when explicit weights are supplied. Current corpus has no weights → `UNAVAILABLE`. No override field exists.

## Open items carried forward

`CT1-OI-001` · `CT1-OI-002` · `CT1-OI-003` remain open.

New: `CT2-OI-001` · `CT2-OI-002`
