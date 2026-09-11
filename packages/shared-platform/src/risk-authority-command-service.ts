import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import {
  appliedMutationEffect,
  replayedMutationEffect,
  type DurableMutationEffect,
} from "./durable-mutation-effect.js";
import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import { redactValue } from "./redaction.js";
import { assertExpectedVersion, assertProtectedHuman, extractRiskEnvelope, newRiskId, riskStamp } from "./risk-command.js";
import {
  assertProductionAllowsFixtureActions,
  assertRiskGovernanceReviewer,
  classifyFixtureAuthorityOnSnap,
  isClassifiedFixtureEdition,
} from "./risk-fixture-provenance.js";
import { decideRuleReviewStatus } from "./risk-policy-operations.js";
import {
  previewExactSelectionWithdrawal,
  sameExactSelectionReceipt,
  withdrawExactSelectionBatchOnSnap,
  withdrawGoverningRuleOnSnap,
} from "./risk-authority-withdrawal.js";
import type { RiskProtectionRepository, RiskTransaction } from "./risk-repository.js";
import {
  RiskAuthorityGovernanceReceiptSchema,
  type RiskAuthorityGovernanceBinding,
  type RiskAuthorityGovernanceReceipt,
  type RiskRuleEdition,
} from "./risk-schemas.js";
import type { AuditEvent } from "./schemas.js";
import type { IdempotencyRecord, PlatformSnapshot } from "./store.js";

export type AuthorityActor = {
  personId: string;
  correlationId: string;
  now?: string;
  actorKind?: "HUMAN" | "AI" | "SERVICE" | "SYSTEM";
};

export type AuthorityOverlay = {
  rules?: RiskRuleEdition[];
  receipts?: RiskAuthorityGovernanceReceipt[];
  audit?: AuditEvent[];
  idempotency?: IdempotencyRecord[];
};

type AuthorityCommandResult<T> = T & { application?: "APPLIED" | "REPLAYED" };

function nowOf(actor: AuthorityActor): string {
  return actor.now ?? new Date().toISOString();
}

function auditEntry(input: {
  action: string;
  outcome: AuditEvent["outcome"];
  actor: AuthorityActor;
  organisationId?: string;
  resourceType: string;
  resourceId?: string;
  idempotencyKey?: string;
  reason?: string;
  now: string;
}): AuditEvent {
  return {
    id: randomUUID(),
    occurredAt: input.now,
    actorType: "USER",
    actorPersonId: input.actor.personId,
    service: "shared-platform",
    action: input.action,
    outcome: input.outcome,
    organisationId: input.organisationId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    correlationId: input.actor.correlationId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    metadata: redactValue({ schemaVersion: SCHEMA_VERSION }) as Record<string, unknown>,
    schemaVersion: SCHEMA_VERSION,
  };
}

export class RiskAuthorityCommandService {
  constructor(
    private readonly repo: RiskProtectionRepository,
    private readonly options: {
      remember?: (overlay: AuthorityOverlay) => void;
      onEffect?: (effect: DurableMutationEffect) => void;
      productionAuthorised?: () => boolean;
    } = {},
  ) {}

  async classifyFixture(
    actor: AuthorityActor,
    input: Parameters<typeof classifyFixtureAuthorityOnSnap>[1],
    authorizationSnap: PlatformSnapshot,
  ): Promise<AuthorityCommandResult<RiskAuthorityGovernanceReceipt>> {
    extractRiskEnvelope(input);
    assertProductionAllowsFixtureActions(Boolean(input.productionAuthorised ?? this.options.productionAuthorised?.()));
    assertProtectedHuman(authorizationSnap, input.assignmentId, actor.personId, actor.actorKind, input.organisationId);
    assertRiskGovernanceReviewer(authorizationSnap, input.assignmentId, actor.personId);
    const now = nowOf(actor);
    const payloadHash = exactHash({
      organisationId: input.organisationId,
      bindings: input.bindings.map((item) => `${item.editionId}:${item.contentHash}:${item.expectedVersion}`).sort(),
      lineage: input.lineage,
    });
    return this.repo.transaction(async (tx) => {
      const scope = { organisationId: input.organisationId };
      const existingKey = await tx.getIdempotency(scope, "risk.fixture.classify", input.idempotencyKey);
      if (existingKey) {
        if (existingKey.hash !== payloadHash) {
          throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
        }
        const reused = await tx.loadAggregate<RiskAuthorityGovernanceReceipt>("riskAuthorityGovernanceReceipts", existingKey.resultRef, scope);
        if (reused) return this.finish(reused, "REPLAYED", { receipts: [reused] });
      }
      const working = structuredClone(authorizationSnap);
      const lockedRules: RiskRuleEdition[] = [];
      for (const binding of input.bindings) {
        if (binding.editionKind === "RULE") {
          const row = await tx.loadAggregate<RiskRuleEdition>("riskRuleEditions", binding.editionId, scope, "FOR_UPDATE");
          if (!row) throw new PlatformError("NOT_FOUND", "edition is not in this organisation");
          lockedRules.push(row);
        }
      }
      overlayLockedRules(working, lockedRules);
      const priorReceipts = await tx.listAggregates<RiskAuthorityGovernanceReceipt>("riskAuthorityGovernanceReceipts", scope);
      working.riskAuthorityGovernanceReceipts = priorReceipts;
      const receipt = classifyFixtureAuthorityOnSnap(working, { ...input, productionAuthorised: Boolean(input.productionAuthorised ?? this.options.productionAuthorised?.()) }, now, actor.personId, actor.actorKind);
      if (priorReceipts.some((item) => item.id === receipt.id)) {
        return this.finish(receipt, "REPLAYED", { receipts: [receipt] });
      }
      await tx.insertImmutable("riskAuthorityGovernanceReceipts", receipt);
      const reloaded = await tx.loadAggregate<RiskAuthorityGovernanceReceipt>("riskAuthorityGovernanceReceipts", receipt.id, scope);
      if (!reloaded) throw new PlatformError("VALIDATION_FAILED", "fixture classification was not durably recorded");
      const overlay = await this.commitReceipts(tx, {
        actor,
        action: "risk.fixture.classify",
        organisationId: input.organisationId,
        resourceType: "risk_authority_governance_receipt",
        resourceId: reloaded.id,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        now,
      });
      return this.finish(reloaded, "APPLIED", { receipts: [reloaded], ...overlay });
    });
  }

  async withdrawRule(
    actor: AuthorityActor,
    input: Parameters<typeof withdrawGoverningRuleOnSnap>[1],
    authorizationSnap: PlatformSnapshot,
  ): Promise<AuthorityCommandResult<RiskRuleEdition>> {
    extractRiskEnvelope(input);
    assertProtectedHuman(authorizationSnap, input.assignmentId, actor.personId, actor.actorKind, input.organisationId);
    assertRiskGovernanceReviewer(authorizationSnap, input.assignmentId, actor.personId);
    if (!input.reason.trim()) throw new PlatformError("VALIDATION_FAILED", "withdrawal reason is required", { field: "reason" });
    const now = nowOf(actor);
    const payloadHash = exactHash({ organisationId: input.organisationId, ruleId: input.ruleId, confirmedHash: input.confirmedHash, reason: input.reason });
    return this.repo.transaction(async (tx) => {
      const scope = { organisationId: input.organisationId };
      const existingKey = await tx.getIdempotency(scope, "risk.rule.withdraw", input.idempotencyKey);
      const locked = await tx.loadAggregate<RiskRuleEdition>("riskRuleEditions", input.ruleId, scope, "FOR_UPDATE");
      if (!locked) throw new PlatformError("NOT_FOUND", "rule edition not found");
      if (existingKey) {
        if (existingKey.hash !== payloadHash) {
          throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
        }
        if (locked.status === "WITHDRAWN" && locked.contentHash === input.confirmedHash) {
          return this.finish(locked, "REPLAYED", { rules: [locked] });
        }
      }
      if (locked.status === "WITHDRAWN" && locked.contentHash === input.confirmedHash) {
        return this.finish(locked, "REPLAYED", { rules: [locked] });
      }
      assertExpectedVersion(locked.version, input.expectedVersion, "rule");
      if (input.confirmedHash !== locked.contentHash) {
        throw new PlatformError("VALIDATION_FAILED", "exact-hash confirmation does not match the selected edition", { field: "confirmedHash" });
      }
      const next = decideRuleReviewStatus(locked, "WITHDRAWN", now, actor.personId);
      await tx.updateVersioned("riskRuleEditions", locked.id, locked.version, next);
      const reloaded = await tx.loadAggregate<RiskRuleEdition>("riskRuleEditions", locked.id, scope);
      if (!reloaded || reloaded.status !== "WITHDRAWN") {
        throw new PlatformError("VALIDATION_FAILED", "withdrawal was not durably recorded");
      }
      const overlay = await this.commitReceipts(tx, {
        actor,
        action: "risk.rule.withdraw",
        organisationId: input.organisationId,
        resourceType: "risk_rule_edition",
        resourceId: reloaded.id,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        now,
        reason: input.reason,
      });
      return this.finish(reloaded, "APPLIED", { rules: [reloaded], ...overlay });
    });
  }

  async withdrawExactSelection(
    actor: AuthorityActor,
    input: Parameters<typeof withdrawExactSelectionBatchOnSnap>[1],
    authorizationSnap: PlatformSnapshot,
  ): Promise<AuthorityCommandResult<RiskAuthorityGovernanceReceipt>> {
    extractRiskEnvelope(input);
    assertProductionAllowsFixtureActions(Boolean(input.productionAuthorised ?? this.options.productionAuthorised?.()));
    assertProtectedHuman(authorizationSnap, input.assignmentId, actor.personId, actor.actorKind, input.organisationId);
    assertRiskGovernanceReviewer(authorizationSnap, input.assignmentId, actor.personId);
    if (!input.reason.trim()) throw new PlatformError("VALIDATION_FAILED", "withdrawal reason is required", { field: "reason" });
    const now = nowOf(actor);
    const payloadHash = exactHash({
      organisationId: input.organisationId,
      selections: input.selections.map((item) => `${item.editionId}:${item.contentHash}`).sort(),
      reason: input.reason,
    });
    return this.repo.transaction(async (tx) => {
      const scope = { organisationId: input.organisationId };
      const locked: RiskRuleEdition[] = [];
      for (const selection of input.selections) {
        const row = await tx.loadAggregate<RiskRuleEdition>("riskRuleEditions", selection.editionId, scope, "FOR_UPDATE");
        if (!row) throw new PlatformError("SCOPE_MISMATCH", "selected edition is outside this organisation");
        locked.push(row);
      }
      const receipts = await tx.listAggregates<RiskAuthorityGovernanceReceipt>("riskAuthorityGovernanceReceipts", scope);
      const working = structuredClone(authorizationSnap);
      overlayLockedRules(working, locked);
      working.riskAuthorityGovernanceReceipts = receipts;
      previewExactSelectionWithdrawal(working, input.organisationId, input.selections);
      if (input.selections.some((selection) => !isClassifiedFixtureEdition(working, input.organisationId, selection.editionId))) {
        throw new PlatformError("FORBIDDEN", "exact-selection batch rejects any row not marked synthetic fixture lineage");
      }
      const existingReceipt = receipts.find((item) => sameExactSelectionReceipt(item, input.organisationId, input.selections, input.reason));
      const existingKey = await tx.getIdempotency(scope, "risk.rule.withdraw.batch", input.idempotencyKey);
      if (existingKey && existingKey.hash !== payloadHash) {
        throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
      }
      const stillApproved = locked.filter((item, index) => {
        const selection = input.selections[index];
        return item.status !== "WITHDRAWN" || item.contentHash !== selection?.contentHash;
      });
      if (!stillApproved.length && (existingReceipt || existingKey)) {
        const receipt = existingReceipt ?? (existingKey ? await tx.loadAggregate<RiskAuthorityGovernanceReceipt>("riskAuthorityGovernanceReceipts", existingKey.resultRef, scope) : undefined);
        if (receipt) return this.finish(receipt, "REPLAYED", { rules: locked, receipts: [receipt] });
      }
      const mutated: RiskRuleEdition[] = [];
      for (const selection of input.selections) {
        const current = locked.find((item) => item.id === selection.editionId);
        if (!current) throw new PlatformError("NOT_FOUND", "rule edition not found");
        if (current.status === "WITHDRAWN" && current.contentHash === selection.contentHash) continue;
        assertExpectedVersion(current.version, selection.expectedVersion, "rule");
        if (selection.contentHash !== current.contentHash) {
          throw new PlatformError("VALIDATION_FAILED", "exact-hash confirmation does not match the selected edition", { field: "confirmedHash" });
        }
        const next = decideRuleReviewStatus(current, "WITHDRAWN", now, actor.personId);
        await tx.updateVersioned("riskRuleEditions", current.id, current.version, next);
        const reloaded = await tx.loadAggregate<RiskRuleEdition>("riskRuleEditions", current.id, scope);
        if (!reloaded || reloaded.status !== "WITHDRAWN") {
          throw new PlatformError("VALIDATION_FAILED", "withdrawal was not durably recorded");
        }
        mutated.push(reloaded);
      }
      const verified: RiskRuleEdition[] = [];
      for (const selection of input.selections) {
        const reloaded = await tx.loadAggregate<RiskRuleEdition>("riskRuleEditions", selection.editionId, scope);
        if (!reloaded || reloaded.status !== "WITHDRAWN") {
          throw new PlatformError("VALIDATION_FAILED", "withdrawal was not durably recorded");
        }
        verified.push(reloaded);
      }
      const correlationId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.correlationId ?? actor.correlationId ?? "")
        ? (input.correlationId ?? actor.correlationId)!
        : randomUUID();
      const bindings: RiskAuthorityGovernanceBinding[] = verified.map((item) => ({
        editionId: item.id,
        editionKind: "RULE",
        ruleKey: item.ruleKey,
        contentHash: item.contentHash,
        expectedVersion: item.version,
      }));
      const receipt =
        existingReceipt ??
        RiskAuthorityGovernanceReceiptSchema.parse({
          id: newRiskId(),
          organisationId: input.organisationId,
          kind: "EXACT_SELECTION_BATCH",
          bindings,
          decision: "WITHDRAWN",
          reason: input.reason,
          classifiedByPersonId: actor.personId,
          correlationId,
          previewedAt: now,
          ...riskStamp(now),
        });
      if (!existingReceipt) {
        await tx.insertImmutable("riskAuthorityGovernanceReceipts", receipt);
      }
      const durableReceipt = await tx.loadAggregate<RiskAuthorityGovernanceReceipt>("riskAuthorityGovernanceReceipts", receipt.id, scope);
      if (!durableReceipt) throw new PlatformError("VALIDATION_FAILED", "withdrawal receipt was not durably recorded");
      const overlayAudits: AuditEvent[] = [];
      const overlayIdem: IdempotencyRecord[] = [];
      if (mutated.length) {
        for (const edition of mutated) {
          const entry = auditEntry({
            action: "risk.rule.withdraw",
            outcome: "SUCCESS",
            actor,
            organisationId: input.organisationId,
            resourceType: "risk_rule_edition",
            resourceId: edition.id,
            idempotencyKey: input.idempotencyKey,
            reason: input.reason,
            now,
          });
          await tx.appendAudit(entry);
          overlayAudits.push(entry);
        }
        if (!existingKey) {
          const committed = await this.commitReceipts(tx, {
            actor,
            action: "risk.rule.withdraw.batch",
            organisationId: input.organisationId,
            resourceType: "risk_authority_governance_receipt",
            resourceId: durableReceipt.id,
            idempotencyKey: input.idempotencyKey,
            payloadHash,
            now,
            reason: input.reason,
          });
          overlayAudits.push(...(committed.audit ?? []));
          overlayIdem.push(...(committed.idempotency ?? []));
        }
      }
      return this.finish(durableReceipt, mutated.length ? "APPLIED" : "REPLAYED", {
        rules: verified,
        receipts: [durableReceipt],
        audit: overlayAudits,
        idempotency: overlayIdem,
      });
    });
  }

  private async commitReceipts(
    tx: RiskTransaction,
    input: {
      actor: AuthorityActor;
      action: string;
      organisationId: string;
      resourceType: string;
      resourceId: string;
      idempotencyKey: string;
      payloadHash: string;
      now: string;
      reason?: string;
    },
  ): Promise<Pick<AuthorityOverlay, "audit" | "idempotency">> {
    const entry = auditEntry({
      action: input.action,
      outcome: "SUCCESS",
      actor: input.actor,
      organisationId: input.organisationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason,
      now: input.now,
    });
    await tx.appendAudit(entry);
    await tx.insertIdempotency({
      organisationId: input.organisationId,
      action: input.action,
      idempotencyKey: input.idempotencyKey,
      resultRef: input.resourceId,
      hash: input.payloadHash,
      createdAt: input.now,
    });
    return {
      audit: [entry],
      idempotency: [
        {
          key: input.idempotencyKey,
          action: input.action,
          hash: input.payloadHash,
          resultRef: input.resourceId,
          createdAt: input.now,
        },
      ],
    };
  }

  private finish<T extends { id?: string }>(result: T, application: "APPLIED" | "REPLAYED", overlay: AuthorityOverlay): AuthorityCommandResult<T> {
    this.options.onEffect?.(application === "REPLAYED" ? replayedMutationEffect(result.id) : appliedMutationEffect(result.id));
    this.options.remember?.(overlay);
    return { ...result, application };
  }
}

function overlayLockedRules(snap: PlatformSnapshot, rules: RiskRuleEdition[]): void {
  const byId = new Map(snap.riskRuleEditions.map((item) => [item.id, item]));
  for (const row of rules) byId.set(row.id, row);
  snap.riskRuleEditions = [...byId.values()];
}
