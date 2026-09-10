# EOS-S05B Detailed Cursor Pack A Control and Foundations

**Status:** Ratification draft — becomes executable only inside a separately released MD-PR-S054 authority prompt

## Cursor operating contract

Work continuously through all four volumes. Do not stop after individual units unless a stated stop condition occurs. Use focused commits at coherent boundaries, then one consolidated evidence report. Do not self-accept EOS-S05B.

Required starting repository is `kglaw-Oluseyi/atelier-doclar`, branch `main`, baseline to be restated by the release prompt. Railway scope is `atelier-doclar / production / event-os` only. Verify a clean non-overlapping worktree. Preserve user changes. Never force-push, amend accepted commits, reset destructively or touch another service.

## Stop conditions

Stop only for baseline mismatch, overlapping worktree, destructive migration, missing human-controlled secret, real-data risk, contradictory controlling requirements, or an external effect that requires new authority. Ordinary defects are fixed within the milestone and reported honestly.

## Unit RPC-01 Canonical inspection

Read current state, S05/S05A acceptance, document authority, compatibility, successor register, deploy policy, technical debt, Event OS product manifest and existing party/vendor/budget/communications/spatial contracts. Produce an internal compatibility map before editing. Do not reopen accepted behaviour.

**Evidence:** exact files inspected; resolved extension points; no parallel ledgers.

## Unit RPC-02 Domain file architecture

Create bounded shared-platform modules, adapting names only to repository convention:

```text
risk-schemas.ts
risk-policy-operations.ts
risk-applicability.ts
risk-gap-engine.ts
risk-clause-operations.ts
risk-vendor-assessment.ts
risk-continuity.ts
risk-incidents.ts
risk-budget-projection.ts
risk-disclosure.ts
risk-projections.ts
risk-evaluation-*.ts
risk-migration.ts
```

Event OS components must be similarly bounded; do not grow one giant workspace or actions file.

## Unit RPC-03 Shared primitives and schemas

Implement strict Zod schemas and inferred TypeScript types for record scope, evidence references, verification, legal review, Money, DateRange, document classification, policy type, coverage limits, deductibles, risk indicators and command envelopes. Reject unknown keys at trust boundaries.

```ts
const RecordScopeSchema = z.discriminatedUnion("kind", [
  z.object({kind:z.literal("ORGANISATION"), organisationId:Uuid}).strict(),
  z.object({kind:z.literal("EVENT"), organisationId:Uuid, eventId:Uuid}).strict()
]);

const RiskCommandEnvelopeSchema = z.object({
  organisationId: Uuid,
  eventId: Uuid.optional(),
  assignmentId: Uuid,
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(12).max(200),
  reason: z.string().trim().max(2000).optional()
}).strict();
```

Test invalid currencies, fractional minor units, negative limits, cross-scope IDs, invalid dates, oversized narratives and extra keys.

## Unit RPC-04 Permissions

Add granular permissions from document 09 to the canonical permission catalogue and fixtures. System Administrator gets configuration only. CEO permissions remain explicit rather than a bypass. Client, Auditor, Planner, Event Director, risk/legal reviewer and system administrator projections must be separate.

Test server denial for UI-hidden actions, cross-event and cross-organisation calls, unauthenticated routes and stale assignments.

## Unit RPC-05 Persistence and migration

Design normalized Postgres persistence for editions, evidence, applicability snapshots, gaps, decisions, check-ins, activations, incidents and dossier editions. Use unique constraints for idempotency and one-current-edition invariants. Add replay-safe migration receipts. Memory and Postgres stores must obey the same contract.

Test migration twice, legacy unknowns, equal timestamps, concurrency conflict and partial persistence failure. Never let a redirect throw replace a persist failure or vice versa.

## Unit RPC-06 Evidence and immutable documents

Implement metadata creation, safe upload completion, edition supersession and retrieval. Completion occurs only after durable object put. Hash exact bytes. Store encryption-sensitive fields separately. Upload does not mean verified.

Required states: `PENDING_UPLOAD`, `UPLOADED`, `SCAN_PENDING`, `CLEAN`, `QUARANTINED`, `SCAN_FAILED`, `VERIFIED`, `REJECTED`, `EXPIRED`, `SUPERSEDED` with valid transition checks.

## Unit RPC-07 Central disclosure policy

Implement one server policy for legal advice, personal data, policy identifiers, limits/deductibles, restricted incidents and internal vendor assessments. Apply it to workspaces, comparisons, audit, JSON routes and exports. Full projections must preserve domain identity; permission-safe projections may mask/omit but must not alter hashes used as domain content.

## Unit RPC-08 Audit and action results

Every command returns `APPLIED`, `REPLAYED` or `NOT_APPLIED`, `didDataChange`, subject/version, correlation, retry safety and readable detail. Audit denied actions and external effects. Project usable actor display names when permitted; do not make oversight UUID-only.

## Unit RPC-09 Organisation and event navigation

Add organisation Protection Command and event Protection workspace without disrupting current navigation. At 360px use labelled sections/cards, not horizontally clipped tables. Establish page landmarks, breadcrumbs, skip target and predictable tabs.

## Unit RPC-10 Foundation gates

Run focused schema/migration/permission/disclosure tests, typecheck and Event OS build. Commit foundation only when these pass. Continue to Pack B without waiting for human approval.

