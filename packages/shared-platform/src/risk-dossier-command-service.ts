import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import {
  appliedMutationEffect,
  replayedMutationEffect,
  type DurableMutationEffect,
} from "./durable-mutation-effect.js";
import { PlatformError } from "./errors.js";
import { redactValue, stableHash } from "./redaction.js";
import { extractRiskEnvelope } from "./risk-command.js";
import {
  assertGrantUsable,
  buildDossierEdition,
  buildDossierExport,
  decideClientMessage,
  decideDossierPublication,
  decideDossierTransition,
  decideGrantIssue,
  decideGrantRevoke,
  requireApplicabilityForAssemble,
} from "./risk-dossier-decisions.js";
import { generateDossierAccessToken, hashDossierAccessToken } from "./risk-dossier-access.js";
import { systemClock, type PlatformClock } from "./platform-clock.js";
import type { RiskDossierRepository, RiskDossierTransaction, RiskDossierWorkspace } from "./risk-dossier-repository.js";
import { redactDossier, type RiskProjectionAudience } from "./risk-disclosure.js";
import type {
  RiskDossierAccessGrant,
  RiskDossierEdition,
  RiskDossierExport,
  RiskDossierPublication,
} from "./risk-schemas.js";
import type { AuditEvent } from "./schemas.js";

export type DossierActor = {
  personId: string;
  correlationId: string;
  now?: string;
  actorKind?: "HUMAN" | "AI" | "SERVICE" | "SYSTEM";
};

export type DossierCommandResult<T> = T & { application?: "APPLIED" | "REPLAYED" };

export type DossierOverlay = {
  editions?: RiskDossierEdition[];
  publications?: RiskDossierPublication[];
  grants?: RiskDossierAccessGrant[];
  exports?: RiskDossierExport[];
};

function nowOf(actor: DossierActor): string {
  return actor.now ?? new Date().toISOString();
}

function auditEntry(input: {
  action: string;
  outcome: AuditEvent["outcome"];
  actor: DossierActor;
  organisationId?: string;
  eventId?: string;
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
    eventId: input.eventId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    correlationId: input.actor.correlationId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    metadata: redactValue({ schemaVersion: SCHEMA_VERSION }) as Record<string, unknown>,
    schemaVersion: SCHEMA_VERSION,
  };
}

async function assertHumanAssignment(
  tx: RiskDossierTransaction,
  assignmentId: string,
  actorPersonId: string,
  organisationId: string,
  actorKind?: string,
): Promise<void> {
  if (actorKind === "AI") {
    throw new PlatformError("AI_AUTHORITY_FORBIDDEN", "AI cannot approve a governing protection decision");
  }
  const assignment = await tx.loadAssignment(assignmentId, { organisationId });
  if (!assignment || assignment.status !== "ACTIVE" || assignment.personId !== actorPersonId) {
    throw new PlatformError("FORBIDDEN", "current assignment is required");
  }
}

async function replayOrConsume(
  tx: RiskDossierTransaction,
  scope: { organisationId: string; eventId?: string },
  action: string,
  key: string,
  payloadHash: string,
  loadResult: (resultRef: string) => Promise<{ id: string } | undefined>,
): Promise<{ id: string } | undefined> {
  const existing = await tx.getIdempotency(scope, action, key);
  if (!existing) return undefined;
  if (existing.hash !== payloadHash) {
    throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
  }
  return loadResult(existing.resultRef);
}

async function commitReceipt(
  tx: RiskDossierTransaction,
  input: {
    actor: DossierActor;
    action: string;
    organisationId: string;
    eventId?: string;
    resourceType: string;
    resourceId: string;
    idempotencyKey: string;
    payloadHash: string;
    now: string;
  },
): Promise<void> {
  await tx.appendAudit(
    auditEntry({
      action: input.action,
      outcome: "SUCCESS",
      actor: input.actor,
      organisationId: input.organisationId,
      eventId: input.eventId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      idempotencyKey: input.idempotencyKey,
      now: input.now,
    }),
  );
  await tx.insertIdempotency({
    organisationId: input.organisationId,
    action: input.action,
    idempotencyKey: input.idempotencyKey,
    resultRef: input.resourceId,
    hash: input.payloadHash,
    createdAt: input.now,
  });
}

export class RiskDossierCommandService {
  constructor(
    private readonly repo: RiskDossierRepository,
    private readonly options: {
      tokenPepper: () => string;
      clock?: PlatformClock;
      remember?: (overlay: DossierOverlay) => void;
      onEffect?: (effect: DurableMutationEffect) => void;
    },
  ) {}

  private clockNow(): string {
    return (this.options.clock ?? systemClock).now().toISOString();
  }

  private tokenNow(actor?: DossierActor): string {
    return actor?.now ?? this.clockNow();
  }

  private finish<T extends { id?: string }>(result: T, application: "APPLIED" | "REPLAYED", overlay?: DossierOverlay): T {
    this.options.remember?.(overlay ?? {});
    this.options.onEffect?.(application === "REPLAYED" ? replayedMutationEffect(result.id) : appliedMutationEffect(result.id));
    return { ...result, application };
  }

  async assemble(actor: DossierActor, raw: unknown): Promise<DossierCommandResult<RiskDossierEdition>> {
    const input = raw as {
      organisationId: string;
      eventId: string;
      assignmentId: string;
      expectedVersion: number;
      idempotencyKey: string;
    };
    extractRiskEnvelope(input);
    const now = nowOf(actor);
    const payloadHash = stableHash({ action: "risk.dossier.assemble", ...input });
    return this.repo.transaction(async (tx) => {
      const replayed = await replayOrConsume(tx, input, "risk.dossier.assemble", input.idempotencyKey, payloadHash, (id) =>
        tx.loadEdition(id, input),
      );
      if (replayed) return this.finish(replayed as RiskDossierEdition, "REPLAYED", { editions: [replayed as RiskDossierEdition] });
      const scope = { organisationId: input.organisationId, eventId: input.eventId };
      const snapshot = requireApplicabilityForAssemble(await tx.loadApplicabilitySnapshot({ eventId: input.eventId }, scope));
      const current = await tx.loadCurrentWorking(scope, "FOR_UPDATE");
      const prior = current ?? (await tx.loadAnyCurrentEdition(scope, "FOR_UPDATE"));
      const editionCount = await tx.countEventEditions(scope);
      const edition = buildDossierEdition({
        organisationId: input.organisationId,
        eventId: input.eventId,
        now,
        actorPersonId: actor.personId,
        snapshotHash: snapshot.contentHash,
        versionNumber: editionCount + 1,
        supersedesEditionId: current?.id ?? prior?.id,
      });
      const demote = current ?? prior;
      if (demote) {
        await tx.updateEdition(demote.id, demote.version, { ...demote, current: false, version: demote.version + 1, updatedAt: now });
      }
      await tx.insertEdition(edition);
      await commitReceipt(tx, {
        actor,
        action: "risk.dossier.assemble",
        organisationId: input.organisationId,
        eventId: input.eventId,
        resourceType: "risk_dossier_edition",
        resourceId: edition.id,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        now,
      });
      const reloaded = (await tx.loadEdition(edition.id, scope)) ?? edition;
      return this.finish(reloaded, "APPLIED", { editions: [reloaded, ...(current ? [{ ...current, current: false }] : [])] });
    });
  }

  async submit(actor: DossierActor, raw: unknown): Promise<DossierCommandResult<RiskDossierEdition>> {
    return this.transition(actor, raw, "SUBMITTED");
  }

  async approve(actor: DossierActor, raw: unknown): Promise<DossierCommandResult<RiskDossierEdition>> {
    return this.transition(actor, raw, "APPROVED");
  }

  private async transition(actor: DossierActor, raw: unknown, to: "SUBMITTED" | "APPROVED"): Promise<DossierCommandResult<RiskDossierEdition>> {
    const input = raw as {
      organisationId: string;
      eventId: string;
      assignmentId: string;
      expectedVersion: number;
      idempotencyKey: string;
      dossierId: string;
      approvedHash?: string;
    };
    extractRiskEnvelope(input);
    const now = nowOf(actor);
    const action = to === "SUBMITTED" ? "risk.dossier.submit" : "risk.dossier.approve";
    const payloadHash = stableHash({ action, ...input, to });
    return this.repo.transaction(async (tx) => {
      const replayed = await replayOrConsume(tx, input, action, input.idempotencyKey, payloadHash, (id) => tx.loadEdition(id, input));
      if (replayed) return this.finish(replayed as RiskDossierEdition, "REPLAYED", { editions: [replayed as RiskDossierEdition] });
      const scope = { organisationId: input.organisationId, eventId: input.eventId };
      await assertHumanAssignment(tx, input.assignmentId, actor.personId, input.organisationId, actor.actorKind);
      const current = await tx.loadEdition(input.dossierId, scope, "FOR_UPDATE");
      if (!current) throw new PlatformError("NOT_FOUND", "dossier edition not found");
      const next = decideDossierTransition(current, { to, expectedVersion: input.expectedVersion, approvedHash: input.approvedHash }, actor.personId, now);
      await tx.updateEdition(current.id, current.version, { ...next });
      await commitReceipt(tx, {
        actor,
        action,
        organisationId: input.organisationId,
        eventId: input.eventId,
        resourceType: "risk_dossier_edition",
        resourceId: next.id,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        now,
      });
      const reloaded = (await tx.loadEdition(next.id, scope)) ?? next;
      return this.finish(reloaded, "APPLIED", { editions: [reloaded] });
    });
  }

  async publish(actor: DossierActor, raw: unknown): Promise<DossierCommandResult<RiskDossierPublication>> {
    const input = raw as {
      organisationId: string;
      eventId: string;
      assignmentId: string;
      expectedVersion: number;
      idempotencyKey: string;
      dossierId?: string;
      editionId?: string;
      approvedHash?: string;
    };
    extractRiskEnvelope(input);
    const editionId = input.editionId ?? input.dossierId;
    if (!editionId) throw new PlatformError("VALIDATION_FAILED", "publication requires an edition id");
    const now = nowOf(actor);
    const payloadHash = stableHash({ action: "risk.dossier.publish", ...input });
    return this.repo.transaction(async (tx) => {
      const replayed = await replayOrConsume(tx, input, "risk.dossier.publish", input.idempotencyKey, payloadHash, async (id) => {
        const publication = await tx.loadCurrentPublication({ organisationId: input.organisationId, eventId: input.eventId });
        return publication?.id === id ? publication : undefined;
      });
      if (replayed) return this.finish(replayed as RiskDossierPublication, "REPLAYED", { publications: [replayed as RiskDossierPublication] });
      const scope = { organisationId: input.organisationId, eventId: input.eventId };
      await assertHumanAssignment(tx, input.assignmentId, actor.personId, input.organisationId, actor.actorKind);
      const edition = await tx.loadEdition(editionId, scope, "FOR_UPDATE");
      if (!edition) throw new PlatformError("NOT_FOUND", "dossier edition not found");
      const snapshot = await tx.loadApplicabilitySnapshot({ eventId: input.eventId, contentHash: edition.componentHashes[0] }, scope);
      let mandatoryIndeterminate = false;
      for (const requirement of snapshot?.requirements ?? []) {
        if (requirement.decision !== "INDETERMINATE") continue;
        if (await tx.loadRuleMandatory(requirement.ruleEditionId, scope)) mandatoryIndeterminate = true;
      }
      const prior = await tx.loadCurrentPublication(scope, "FOR_UPDATE");
      const publicationNumber = (await tx.countEventPublications(scope)) + 1;
      const decided = decideDossierPublication(
        edition,
        prior,
        { organisationId: input.organisationId, eventId: input.eventId, expectedVersion: input.expectedVersion, approvedHash: input.approvedHash, publicationNumber },
        actor.personId,
        now,
        snapshot,
        mandatoryIndeterminate,
      );
      if (decided.application === "REPLAYED") {
        await commitReceipt(tx, {
          actor,
          action: "risk.dossier.publish",
          organisationId: input.organisationId,
          eventId: input.eventId,
          resourceType: "risk_dossier_publication",
          resourceId: decided.publication.id,
          idempotencyKey: input.idempotencyKey,
          payloadHash,
          now,
        });
        return this.finish(decided.publication, "REPLAYED", { publications: [decided.publication] });
      }
      if (decided.priorPatch && prior) await tx.updatePublication(prior.id, prior.version, decided.priorPatch);
      await tx.insertPublication(decided.publication);
      await tx.updateEdition(edition.id, edition.version, decided.editionPatch);
      await commitReceipt(tx, {
        actor,
        action: "risk.dossier.publish",
        organisationId: input.organisationId,
        eventId: input.eventId,
        resourceType: "risk_dossier_publication",
        resourceId: decided.publication.id,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        now,
      });
      const reloaded = (await tx.loadCurrentPublication(scope)) ?? decided.publication;
      return this.finish(reloaded, "APPLIED", {
        publications: [reloaded, ...(decided.priorPatch ? [decided.priorPatch] : [])],
        editions: [decided.editionPatch],
      });
    });
  }

  async export(actor: DossierActor, raw: unknown): Promise<RiskDossierExport> {
    const input = raw as {
      organisationId: string;
      eventId: string;
      assignmentId: string;
      expectedVersion: number;
      idempotencyKey: string;
      dossierId: string;
    };
    extractRiskEnvelope(input);
    const now = nowOf(actor);
    const payloadHash = stableHash({ action: "risk.dossier.export", ...input });
    return this.repo.transaction(async (tx) => {
      const replayed = await replayOrConsume(tx, input, "risk.dossier.export", input.idempotencyKey, payloadHash, async (id) => {
        void id;
        return undefined;
      });
      if (replayed) return this.finish(replayed as RiskDossierExport, "REPLAYED");
      const scope = { organisationId: input.organisationId, eventId: input.eventId };
      await assertHumanAssignment(tx, input.assignmentId, actor.personId, input.organisationId, actor.actorKind);
      const dossier = await tx.loadEdition(input.dossierId, scope);
      const publication = await tx.loadCurrentPublication(scope);
      if (!dossier || !publication) throw new PlatformError("VALIDATION_FAILED", "export requires a published dossier edition");
      const record = buildDossierExport(dossier, publication, input, now, actor.personId);
      await tx.insertExport(record);
      await commitReceipt(tx, {
        actor,
        action: "risk.dossier.export",
        organisationId: input.organisationId,
        eventId: input.eventId,
        resourceType: "risk_dossier_export",
        resourceId: record.id,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        now,
      });
      return this.finish(record, "APPLIED", { exports: [record] });
    });
  }

  async issueClientAccess(actor: DossierActor, raw: unknown): Promise<RiskDossierAccessGrant & { token: string }> {
    const input = raw as {
      organisationId: string;
      eventId: string;
      assignmentId: string;
      expectedVersion: number;
      idempotencyKey: string;
      audiencePersonId?: string;
    };
    extractRiskEnvelope(input);
    const now = this.tokenNow(actor);
    const token = generateDossierAccessToken();
    const tokenHash = hashDossierAccessToken(token, this.options.tokenPepper());
    const expiresAt = new Date(Date.parse(now) + 7 * 24 * 3600_000).toISOString();
    const payloadHash = stableHash({ action: "risk.dossier.client_access.issue", ...input });
    const grant = await this.repo.transaction(async (tx) => {
      const replayed = await replayOrConsume(tx, input, "risk.dossier.client_access.issue", input.idempotencyKey, payloadHash, (id) =>
        tx.loadGrant(id, input),
      );
      if (replayed) return this.finish(replayed as RiskDossierAccessGrant, "REPLAYED", { grants: [replayed as RiskDossierAccessGrant] });
      const scope = { organisationId: input.organisationId, eventId: input.eventId };
      if (!(await tx.loadCurrentPublication(scope))) {
        throw new PlatformError("VALIDATION_FAILED", "client access requires a current dossier publication");
      }
      const prior = await tx.findActiveGrant(scope, "FOR_UPDATE");
      const decided = decideGrantIssue(prior, { ...input, tokenHash, expiresAt }, now, actor.personId);
      if (decided.priorPatch && prior) await tx.updateGrant(prior.id, prior.version, decided.priorPatch);
      await tx.insertGrant(decided.grant);
      await commitReceipt(tx, {
        actor,
        action: "risk.dossier.client_access.issue",
        organisationId: input.organisationId,
        eventId: input.eventId,
        resourceType: "risk_dossier_access_grant",
        resourceId: decided.grant.id,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        now,
      });
      const reloaded = (await tx.loadGrant(decided.grant.id, scope)) ?? decided.grant;
      return this.finish(reloaded, "APPLIED", { grants: [reloaded, ...(decided.priorPatch ? [decided.priorPatch] : [])] });
    });
    return { ...grant, token };
  }

  async revokeClientAccess(actor: DossierActor, raw: unknown): Promise<RiskDossierAccessGrant> {
    const input = raw as {
      organisationId: string;
      eventId: string;
      assignmentId: string;
      expectedVersion: number;
      idempotencyKey: string;
      grantId: string;
    };
    extractRiskEnvelope(input);
    const now = this.tokenNow(actor);
    const payloadHash = stableHash({ action: "risk.dossier.client_access.revoke", ...input });
    return this.repo.transaction(async (tx) => {
      const replayed = await replayOrConsume(tx, input, "risk.dossier.client_access.revoke", input.idempotencyKey, payloadHash, (id) =>
        tx.loadGrant(id, input),
      );
      if (replayed) return this.finish(replayed as RiskDossierAccessGrant, "REPLAYED", { grants: [replayed as RiskDossierAccessGrant] });
      const scope = { organisationId: input.organisationId, eventId: input.eventId };
      const grant = await tx.loadGrant(input.grantId, scope, "FOR_UPDATE");
      if (!grant) throw new PlatformError("NOT_FOUND", "dossier access grant was not found");
      const next = decideGrantRevoke(grant, now, actor.personId);
      await tx.updateGrant(grant.id, grant.version, next);
      await commitReceipt(tx, {
        actor,
        action: "risk.dossier.client_access.revoke",
        organisationId: input.organisationId,
        eventId: input.eventId,
        resourceType: "risk_dossier_access_grant",
        resourceId: next.id,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        now,
      });
      return this.finish(next, "APPLIED", { grants: [next] });
    });
  }

  async renewClientAccess(actor: DossierActor, raw: unknown): Promise<RiskDossierAccessGrant & { token: string }> {
    const input = raw as {
      organisationId: string;
      eventId: string;
      assignmentId: string;
      expectedVersion: number;
      idempotencyKey: string;
      grantId: string;
    };
    extractRiskEnvelope(input);
    await this.revokeClientAccess(actor, input);
    return this.issueClientAccess(actor, { ...input, idempotencyKey: `${input.idempotencyKey}-renewed` });
  }

  async resolveClientSession(token: string, now?: string) {
    const resolvedNow = now ?? this.clockNow();
    const tokenHash = hashDossierAccessToken(token, this.options.tokenPepper());
    return this.repo.transaction(async (tx) => {
      const grant = await tx.findGrantByTokenHash(tokenHash);
      if (!grant) throw new PlatformError("NOT_FOUND", "dossier access is not available");
      const usable = assertGrantUsable(grant, resolvedNow);
      const published = await tx.loadPublicationEdition({ organisationId: usable.organisationId, eventId: usable.eventId });
      return {
        grant: { id: usable.id, eventId: usable.eventId, organisationId: usable.organisationId, status: usable.status, expiresAt: usable.expiresAt },
        dossier: {
          organisationId: usable.organisationId,
          eventId: usable.eventId,
          published: Boolean(published && (published.publication.contentHash ?? published.publication.approvedHash) === published.edition.contentHash),
          publicationNumber: published?.publication.publicationNumber,
          publishedAt: published?.publication.publishedAt,
          contentHash: published?.edition.contentHash,
          limitations: published?.edition.limitations,
          phrases: (await import("./risk-dossier-decisions.js")).clientDossierCopy().phrases,
          messages: published?.publication.clientMessages ?? [],
          canEditStaffTruth: false,
          workingEditionId: (await tx.loadCurrentWorking({ organisationId: usable.organisationId, eventId: usable.eventId }))?.id,
          publishedEditionId: published?.edition.id,
        },
      };
    });
  }

  async recordClientMessage(actor: DossierActor, raw: unknown): Promise<RiskDossierPublication> {
    const input = raw as {
      organisationId: string;
      eventId: string;
      assignmentId: string;
      expectedVersion: number;
      idempotencyKey: string;
      kind: "ACKNOWLEDGE" | "QUESTION";
      body: string;
    };
    extractRiskEnvelope(input);
    const now = nowOf(actor);
    const payloadHash = stableHash({ action: "risk.dossier.client-message", ...input });
    return this.repo.transaction(async (tx) => {
      const scope = { organisationId: input.organisationId, eventId: input.eventId };
      const published = await tx.loadPublicationEdition(scope);
      if (!published) throw new PlatformError("NOT_FOUND", "no published client dossier is available");
      const decided = decideClientMessage(published.publication, published.edition, input, now, actor.personId);
      await tx.updatePublication(published.publication.id, published.publication.version, decided.publication);
      await commitReceipt(tx, {
        actor,
        action: "risk.dossier.client-message",
        organisationId: input.organisationId,
        eventId: input.eventId,
        resourceType: "risk_dossier_publication",
        resourceId: decided.publication.id,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        now,
      });
      return this.finish(decided.publication, "APPLIED", { publications: [decided.publication] });
    });
  }

  async recordClientMessageByToken(token: string, raw: unknown): Promise<RiskDossierPublication> {
    const tokenHash = hashDossierAccessToken(token, this.options.tokenPepper());
    const input = raw as { kind: "ACKNOWLEDGE" | "QUESTION"; body: string; idempotencyKey?: string };
    const now = this.clockNow();
    return this.repo.transaction(async (tx) => {
      const grant = await tx.findGrantByTokenHash(tokenHash);
      if (!grant) throw new PlatformError("NOT_FOUND", "dossier access is not available");
      const usable = assertGrantUsable(grant, now);
      const published = await tx.loadPublicationEdition({ organisationId: usable.organisationId, eventId: usable.eventId });
      if (!published) throw new PlatformError("NOT_FOUND", "no published client dossier is available");
      const decided = decideClientMessage(published.publication, published.edition, input, now, usable.audiencePersonId ?? usable.issuedByPersonId);
      await tx.updatePublication(published.publication.id, published.publication.version, decided.publication);
      return this.finish(decided.publication, "APPLIED", { publications: [decided.publication] });
    });
  }

  async getStaffWorkspace(
    organisationId: string,
    eventId: string,
    audience: RiskProjectionAudience,
  ): Promise<
    RiskDossierWorkspace & {
      workingDossier?: ReturnType<typeof redactDossier>;
      dossiers: Array<ReturnType<typeof redactDossier>>;
      publications: RiskDossierPublication[];
      accessGrants: RiskDossierAccessGrant[];
    }
  > {
    const workspace = await this.repo.getWorkspace({ organisationId, eventId, actorProjection: audience });
    return {
      ...workspace,
      workingDossier: workspace.workingEdition ? redactDossier(workspace.workingEdition, audience) : undefined,
      dossiers: workspace.recentEditions.map((item) => redactDossier(item, audience)),
      publications: workspace.recentPublications,
      accessGrants: workspace.grants,
    };
  }

  async getClientProjection(organisationId: string, eventId: string) {
    return this.repo.transaction(async (tx) => {
      const published = await tx.loadPublicationEdition({ organisationId, eventId });
      const working = await tx.loadCurrentWorking({ organisationId, eventId });
      const copy = (await import("./risk-dossier-decisions.js")).clientDossierCopy();
      const hashOk = Boolean(
        published && (published.publication.contentHash ?? published.publication.approvedHash) === published.edition.contentHash,
      );
      return {
        organisationId,
        eventId,
        published: hashOk,
        publicationNumber: published?.publication.publicationNumber,
        publishedAt: published?.publication.publishedAt,
        contentHash: hashOk ? published?.edition.contentHash : undefined,
        limitations: hashOk ? published?.edition.limitations : undefined,
        phrases: copy.phrases,
        messages: hashOk ? (published?.publication.clientMessages ?? []) : [],
        canEditStaffTruth: false,
        workingEditionId: working?.id,
        publishedEditionId: hashOk ? published?.edition.id : undefined,
      };
    });
  }
}

