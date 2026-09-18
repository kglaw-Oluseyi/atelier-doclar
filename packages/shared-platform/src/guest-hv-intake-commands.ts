import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { assertMakerChecker } from "./risk-command.js";
import { stableHash } from "./redaction.js";
import {
  assertJobScope,
  buildReceipt,
  computeApprovalFingerprint,
  emptyProgress,
  fingerprintParts,
  jobNeedsReview,
  promoteCandidateChunk,
  reconciliationBalanced,
  stageCandidates,
  summariseProgress,
  correctionCsv,
} from "./guest-hv-intake-engine.js";
import {
  ApplyHvRowDecisionsInputSchema,
  ConfirmHvMappingInputSchema,
  CreateHvIntakeJobInputSchema,
  HV_INTAKE_LEASE_MS,
  HV_INTAKE_MAPPING_VERSION,
  HvJobActionInputSchema,
  UploadHvIntakeSourceInputSchema,
  type GuestIntakeCandidate,
  type GuestIntakeJob,
  type GuestIntakeReceipt,
  type GuestIntakeSource,
  type GuestMappingEdition,
  type ApplyHvRowDecisionsInput,
  type ConfirmHvMappingInput,
  type CreateHvIntakeJobInput,
  type HvJobActionInput,
  type UploadHvIntakeSourceInput,
} from "./guest-hv-intake-schemas.js";
import {
  autoMapHeaders,
  canonicalTemplateCsv,
  decodeUploadContent,
  hashContent,
  parseUploadedTable,
  sanitizeFilename,
} from "./guest-hv-intake-parse.js";
import type { PlatformSnapshot } from "./store.js";

export { canonicalTemplateCsv, correctionCsv };

export type HvMutateFn = <T>(
  actor: { personId: string; correlationId: string; now?: string },
  input: {
    permission: string;
    scope: { organisationId: string; eventId: string };
    action: string;
    resourceType: string;
    reason?: string;
    idempotencyKey?: string;
    payloadHash: string;
    run: (snap: PlatformSnapshot, ctx: { now: string }) => T;
  },
) => T;

export type HvParseStrict = <T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error?: unknown } }, value: unknown) => T;

export type HvRequireEvent = (snap: PlatformSnapshot, organisationId: string, eventId: string) => {
  id: string;
  organisationId: string;
  clientId: string;
};

function requireJob(snap: PlatformSnapshot, jobId: string): GuestIntakeJob {
  const job = snap.guestIntakeJobs.find((item) => item.id === jobId);
  if (!job) throw new PlatformError("NOT_FOUND", "intake job was not found");
  return job;
}

function bumpJob(job: GuestIntakeJob, now: string): void {
  job.version += 1;
  job.updatedAt = now;
}

function clearApproval(job: GuestIntakeJob): void {
  delete job.approvedByPersonId;
  delete job.approvedAt;
  delete job.approvalFingerprint;
  if (job.submittedByPersonId) {
    job.status = "READY_FOR_APPROVAL";
    delete job.submittedByPersonId;
  }
}

function claimLease(job: GuestIntakeJob, owner: string, now: string): void {
  const expiry = job.leaseExpiresAt ? Date.parse(job.leaseExpiresAt) : 0;
  if (job.leaseOwner && job.leaseOwner !== owner && expiry > Date.parse(now)) {
    throw new PlatformError("VALIDATION_FAILED", "another operator holds the intake lease");
  }
  job.leaseOwner = owner;
  job.leaseExpiresAt = new Date(Date.parse(now) + HV_INTAKE_LEASE_MS).toISOString();
}

export function createGuestIntakeJobCore(
  mutate: HvMutateFn,
  parseStrict: HvParseStrict,
  requireEvent: HvRequireEvent,
  actor: { personId: string; correlationId: string; now?: string },
  raw: unknown,
): GuestIntakeJob {
  const input = parseStrict<CreateHvIntakeJobInput>(CreateHvIntakeJobInputSchema, raw);
  return mutate(actor, {
    permission: "guest.intake.create",
    scope: { organisationId: input.organisationId, eventId: input.eventId },
    action: "guest.intake.job.created",
    resourceType: "guest_intake_job",
    reason: input.reason,
    idempotencyKey: input.idempotencyKey,
    payloadHash: stableHash(input),
    run: (snap, ctx) => {
      const event = requireEvent(snap, input.organisationId, input.eventId);
      const job: GuestIntakeJob = {
        id: randomUUID(),
        organisationId: event.organisationId,
        clientId: event.clientId,
        eventId: event.id,
        name: input.name,
        edition: 1,
        status: "UPLOADED",
        reason: input.reason,
        ...(input.clientSourceRef ? { clientSourceRef: input.clientSourceRef } : {}),
        ...(input.expectedScale ? { expectedScale: input.expectedScale } : {}),
        createdByPersonId: actor.personId,
        checkpointChunkIndex: -1,
        cancelRequested: false,
        progress: emptyProgress(ctx.now, "DRAFT"),
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      };
      snap.guestIntakeJobs.push(job);
      return job;
    },
  });
}

export function uploadGuestIntakeSourceCore(
  mutate: HvMutateFn,
  parseStrict: HvParseStrict,
  requireEvent: HvRequireEvent,
  actor: { personId: string; correlationId: string; now?: string },
  raw: unknown,
): { job: GuestIntakeJob; source: GuestIntakeSource; mapping: GuestMappingEdition } {
  const input = parseStrict<UploadHvIntakeSourceInput>(UploadHvIntakeSourceInputSchema, raw);
  return mutate(actor, {
    permission: "guest.intake.create",
    scope: { organisationId: input.organisationId, eventId: input.eventId },
    action: "guest.intake.source.uploaded",
    resourceType: "guest_intake_source",
    idempotencyKey: input.idempotencyKey,
    payloadHash: stableHash({
      jobId: input.jobId,
      filename: input.filename,
      contentType: input.contentType,
      sha: hashContent(decodeUploadContent(input.contentBase64)),
    }),
    run: (snap, ctx) => {
      requireEvent(snap, input.organisationId, input.eventId);
      const job = requireJob(snap, input.jobId);
      assertJobScope(job, input.organisationId, input.eventId);
      if (job.version !== input.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "intake job changed since this view was loaded");
      }
      if (!["UPLOADED", "MAPPING_REQUIRED", "FAILED"].includes(job.status) && job.status !== "PARSING") {
        throw new PlatformError("VALIDATION_FAILED", "intake job cannot accept a new source in its current state");
      }
      const buffer = decodeUploadContent(input.contentBase64);
      const sha256 = hashContent(buffer);
      let table;
      try {
        table = parseUploadedTable(input.contentType, buffer);
      } catch (error) {
        job.status = "FAILED";
        job.failureClass = "MALFORMED_FILE";
        job.failureMessage = error instanceof PlatformError ? error.message : "File could not be parsed.";
        bumpJob(job, ctx.now);
        throw error;
      }
      const source: GuestIntakeSource = {
        id: randomUUID(),
        organisationId: job.organisationId,
        clientId: job.clientId,
        eventId: job.eventId,
        jobId: job.id,
        filename: sanitizeFilename(input.filename),
        contentType: input.contentType,
        byteSize: buffer.byteLength,
        sha256,
        storageKind: "INLINE_BASE64",
        contentBase64: input.contentBase64,
        scanStatus: "CLEAN",
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      };
      snap.guestIntakeSources.push(source);
      const columns = autoMapHeaders(table.headers);
      const mapping: GuestMappingEdition = {
        id: randomUUID(),
        jobId: job.id,
        organisationId: job.organisationId,
        eventId: job.eventId,
        mappingVersion: HV_INTAKE_MAPPING_VERSION,
        edition: 1,
        columns,
        confirmed: false,
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      };
      snap.guestMappingEditions.push(mapping);
      job.sourceId = source.id;
      job.mappingEditionId = mapping.id;
      job.sourceHash = sha256;
      job.mappingHash = fingerprintParts(columns);
      job.progress = emptyProgress(ctx.now, "PARSING");
      job.progress.rowsTotal = table.rows.length;
      job.progress.phase = "PARSING";
      const needsMapping = columns.some((column) => column.targetField === "UNMAPPED");
      job.status = needsMapping ? "MAPPING_REQUIRED" : "VALIDATING";
      bumpJob(job, ctx.now);
      // stash parsed table marker via progress only; validation step re-parses from source
      return { job, source, mapping };
    },
  });
}

export function confirmGuestIntakeMappingCore(
  mutate: HvMutateFn,
  parseStrict: HvParseStrict,
  actor: { personId: string; correlationId: string; now?: string },
  raw: unknown,
): GuestMappingEdition {
  const input = parseStrict<ConfirmHvMappingInput>(ConfirmHvMappingInputSchema, raw);
  return mutate(actor, {
    permission: "guest.intake.create",
    scope: { organisationId: input.organisationId, eventId: input.eventId },
    action: "guest.intake.mapping.confirmed",
    resourceType: "guest_mapping_edition",
    idempotencyKey: input.idempotencyKey,
    payloadHash: stableHash(input),
    run: (snap, ctx) => {
      const job = requireJob(snap, input.jobId);
      assertJobScope(job, input.organisationId, input.eventId);
      if (job.version !== input.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "intake job changed since this view was loaded");
      }
      const mapping: GuestMappingEdition = {
        id: randomUUID(),
        jobId: job.id,
        organisationId: job.organisationId,
        eventId: job.eventId,
        mappingVersion: HV_INTAKE_MAPPING_VERSION,
        edition: (snap.guestMappingEditions.filter((item) => item.jobId === job.id).length || 0) + 1,
        columns: input.columns,
        confirmed: true,
        confirmedByPersonId: actor.personId,
        confirmedAt: ctx.now,
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      };
      snap.guestMappingEditions.push(mapping);
      job.mappingEditionId = mapping.id;
      job.mappingHash = fingerprintParts(input.columns);
      job.edition += 1;
      clearApproval(job);
      job.status = "VALIDATING";
      bumpJob(job, ctx.now);
      return mapping;
    },
  });
}

export function validateGuestIntakeCore(
  mutate: HvMutateFn,
  parseStrict: HvParseStrict,
  actor: { personId: string; correlationId: string; now?: string },
  raw: unknown,
): GuestIntakeJob {
  const input = parseStrict<HvJobActionInput>(HvJobActionInputSchema, raw);
  return mutate(actor, {
    permission: "guest.intake.create",
    scope: { organisationId: input.organisationId, eventId: input.eventId },
    action: "guest.intake.validated",
    resourceType: "guest_intake_job",
    idempotencyKey: input.idempotencyKey,
    payloadHash: stableHash({ jobId: input.jobId, expectedVersion: input.expectedVersion, op: "validate" }),
    run: (snap, ctx) => {
      const job = requireJob(snap, input.jobId);
      assertJobScope(job, input.organisationId, input.eventId);
      if (job.version !== input.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "intake job changed since this view was loaded");
      }
      const source = snap.guestIntakeSources.find((item) => item.id === job.sourceId);
      const mapping = snap.guestMappingEditions.find((item) => item.id === job.mappingEditionId);
      if (!source?.contentBase64 || !mapping) {
        throw new PlatformError("VALIDATION_FAILED", "source and mapping are required before validation");
      }
      if (!mapping.confirmed && mapping.columns.some((column) => column.targetField === "UNMAPPED")) {
        job.status = "MAPPING_REQUIRED";
        bumpJob(job, ctx.now);
        return job;
      }
      const table = parseUploadedTable(source.contentType, decodeUploadContent(source.contentBase64));
      snap.guestIntakeCandidates = snap.guestIntakeCandidates.filter((item) => item.jobId !== job.id);
      const candidates = stageCandidates({ snap, job, mapping, table, now: ctx.now });
      snap.guestIntakeCandidates.push(...candidates);
      job.progress = summariseProgress(candidates, ctx.now, job.progress);
      job.progress.phase = "VALIDATING";
      job.validationHash = fingerprintParts(candidates.map((item) => ({ row: item.rowNumber, status: item.status, action: item.proposedAction })));
      job.status = jobNeedsReview(candidates) ? "NEEDS_REVIEW" : "READY_FOR_APPROVAL";
      if (!mapping.confirmed) {
        mapping.confirmed = true;
        mapping.confirmedByPersonId = actor.personId;
        mapping.confirmedAt = ctx.now;
        mapping.version += 1;
        mapping.updatedAt = ctx.now;
      }
      bumpJob(job, ctx.now);
      return job;
    },
  });
}

export function applyGuestIntakeDecisionsCore(
  mutate: HvMutateFn,
  parseStrict: HvParseStrict,
  actor: { personId: string; correlationId: string; now?: string },
  raw: unknown,
): GuestIntakeJob {
  const input = parseStrict<ApplyHvRowDecisionsInput>(ApplyHvRowDecisionsInputSchema, raw);
  return mutate(actor, {
    permission: "guest.intake.create",
    scope: { organisationId: input.organisationId, eventId: input.eventId },
    action: "guest.intake.decisions.applied",
    resourceType: "guest_intake_job",
    idempotencyKey: input.idempotencyKey,
    payloadHash: stableHash(input),
    run: (snap, ctx) => {
      const job = requireJob(snap, input.jobId);
      assertJobScope(job, input.organisationId, input.eventId);
      if (job.version !== input.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "intake job changed since this view was loaded");
      }
      const candidates = snap.guestIntakeCandidates.filter((item) => item.jobId === job.id);
      for (const decision of input.decisions) {
        const candidate = candidates.find((item) => item.id === decision.candidateId);
        if (!candidate) throw new PlatformError("NOT_FOUND", "intake row was not found");
        candidate.decision = decision.decision;
        candidate.decidedByPersonId = actor.personId;
        if (decision.decision === "EXCLUDE" || decision.decision === "SKIP") {
          candidate.status = decision.decision === "EXCLUDE" ? "EXCLUDED" : "SKIPPED";
          candidate.proposedAction = decision.decision === "EXCLUDE" ? "EXCLUDE" : "SKIP";
        } else if (decision.decision === "CREATE") {
          candidate.proposedAction = "CREATE";
          candidate.status = "READY";
        } else if (decision.decision === "UPDATE") {
          candidate.proposedAction = "UPDATE";
          candidate.status = candidate.fieldConflicts.some((item) => item.requiresApproval) ? "CONFLICT_REVIEW" : "READY";
        } else if (decision.decision === "KEEP_SEPARATE") {
          candidate.proposedAction = "CREATE";
          candidate.status = "READY";
        } else {
          candidate.status = "DUPLICATE_REVIEW";
        }
        candidate.updatedAt = ctx.now;
        candidate.version += 1;
      }
      job.decisionHash = fingerprintParts(candidates.map((item) => ({ id: item.id, decision: item.decision ?? item.proposedAction })));
      job.edition += 1;
      clearApproval(job);
      job.progress = summariseProgress(candidates, ctx.now, job.progress);
      job.status = jobNeedsReview(candidates) ? "NEEDS_REVIEW" : "READY_FOR_APPROVAL";
      bumpJob(job, ctx.now);
      return job;
    },
  });
}

export function submitGuestIntakeCore(
  mutate: HvMutateFn,
  parseStrict: HvParseStrict,
  actor: { personId: string; correlationId: string; now?: string },
  raw: unknown,
): GuestIntakeJob {
  const input = parseStrict<HvJobActionInput>(HvJobActionInputSchema, raw);
  return mutate(actor, {
    permission: "guest.intake.create",
    scope: { organisationId: input.organisationId, eventId: input.eventId },
    action: "guest.intake.submitted",
    resourceType: "guest_intake_job",
    reason: input.reason,
    idempotencyKey: input.idempotencyKey,
    payloadHash: stableHash({ jobId: input.jobId, expectedVersion: input.expectedVersion, op: "submit" }),
    run: (snap, ctx) => {
      const job = requireJob(snap, input.jobId);
      assertJobScope(job, input.organisationId, input.eventId);
      if (job.version !== input.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "intake job changed since this view was loaded");
      }
      if (job.status !== "READY_FOR_APPROVAL" && job.status !== "NEEDS_REVIEW") {
        throw new PlatformError("VALIDATION_FAILED", "intake is not ready for approval");
      }
      const candidates = snap.guestIntakeCandidates.filter((item) => item.jobId === job.id);
      if (jobNeedsReview(candidates)) {
        throw new PlatformError("VALIDATION_FAILED", "resolve blocking row decisions before submission");
      }
      const fingerprint = computeApprovalFingerprint({
        jobId: job.id,
        edition: job.edition,
        sourceHash: job.sourceHash ?? "",
        mappingHash: job.mappingHash ?? "",
        candidates,
      });
      job.proposedMutationHash = fingerprint;
      job.submittedByPersonId = actor.personId;
      job.status = "SUBMITTED";
      bumpJob(job, ctx.now);
      return job;
    },
  });
}

export function approveGuestIntakeCore(
  mutate: HvMutateFn,
  parseStrict: HvParseStrict,
  actor: { personId: string; correlationId: string; now?: string },
  raw: unknown,
  ceoGovernanceOverrideAllowed = false,
): GuestIntakeJob {
  const input = parseStrict<HvJobActionInput>(HvJobActionInputSchema, raw);
  return mutate(actor, {
    permission: "guest.intake.approve",
    scope: { organisationId: input.organisationId, eventId: input.eventId },
    action: "guest.intake.approved",
    resourceType: "guest_intake_job",
    reason: input.governanceOverrideReason
      ? `CEO_GOVERNANCE_OVERRIDE: ${input.governanceOverrideReason}${input.reason ? ` · ${input.reason}` : ""}`
      : input.reason,
    idempotencyKey: input.idempotencyKey,
    payloadHash: stableHash({ jobId: input.jobId, expectedVersion: input.expectedVersion, op: "approve" }),
    run: (snap, ctx) => {
      const job = requireJob(snap, input.jobId);
      assertJobScope(job, input.organisationId, input.eventId);
      if (job.version !== input.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "intake job changed since this view was loaded");
      }
      if (job.status !== "SUBMITTED") throw new PlatformError("VALIDATION_FAILED", "intake must be submitted before approval");
      if (!job.submittedByPersonId) throw new PlatformError("VALIDATION_FAILED", "intake has no submitter");
      const selfApprove = job.submittedByPersonId === actor.personId;
      const overrideReason =
        input.governanceOverrideReason?.trim() ||
        (ceoGovernanceOverrideAllowed && selfApprove ? "CEO organisation-wide authority self-check" : undefined);
      if (selfApprove) {
        if (!ceoGovernanceOverrideAllowed || !overrideReason) {
          throw new PlatformError("FORBIDDEN", "maker cannot approve their own edition", {
            publicMessage:
              "Maker/checker: the person who submitted this intake cannot approve it. Grant a Director assignment, or complete as organisation-wide CEO.",
          });
        }
      } else {
        assertMakerChecker(job.submittedByPersonId, actor.personId, "approve");
      }
      const candidates = snap.guestIntakeCandidates.filter((item) => item.jobId === job.id);
      const fingerprint = computeApprovalFingerprint({
        jobId: job.id,
        edition: job.edition,
        sourceHash: job.sourceHash ?? "",
        mappingHash: job.mappingHash ?? "",
        candidates,
      });
      if (job.proposedMutationHash && job.proposedMutationHash !== fingerprint) {
        throw new PlatformError("VALIDATION_FAILED", "proposed intake changed after submission; resubmit required");
      }
      job.approvedByPersonId = actor.personId;
      job.approvedAt = ctx.now;
      job.approvalFingerprint = fingerprint;
      job.status = "APPROVED";
      job.guestTotalBefore = snap.operationalGuests.filter(
        (guest) => guest.organisationId === job.organisationId && guest.eventId === job.eventId,
      ).length;
      bumpJob(job, ctx.now);
      return job;
    },
  });
}

export function advanceGuestIntakePromotionCore(
  mutate: HvMutateFn,
  parseStrict: HvParseStrict,
  actor: { personId: string; correlationId: string; now?: string },
  raw: unknown,
): { job: GuestIntakeJob; receipt?: GuestIntakeReceipt } {
  const input = parseStrict<HvJobActionInput>(HvJobActionInputSchema, raw);
  const maxChunks = input.maxChunks ?? 8;
  return mutate(actor, {
    permission: "guest.intake.create",
    scope: { organisationId: input.organisationId, eventId: input.eventId },
    action: "guest.intake.promotion.advanced",
    resourceType: "guest_intake_job",
    idempotencyKey: input.idempotencyKey,
    payloadHash: stableHash({ jobId: input.jobId, expectedVersion: input.expectedVersion, op: "advance", maxChunks }),
    run: (snap, ctx) => {
      const job = requireJob(snap, input.jobId);
      assertJobScope(job, input.organisationId, input.eventId);
      if (job.version !== input.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "intake job changed since this view was loaded");
      }
      if (["COMPLETED", "COMPLETED_WITH_EXCEPTIONS"].includes(job.status)) {
        const receipt = snap.guestIntakeReceipts.find((item) => item.jobId === job.id);
        return { job, ...(receipt ? { receipt } : {}) };
      }
      if (!["APPROVED", "PROMOTING", "PAUSED", "PARTIALLY_COMMITTED"].includes(job.status)) {
        throw new PlatformError("VALIDATION_FAILED", "intake is not approved for promotion");
      }
      if (!job.approvalFingerprint || !job.approvedByPersonId) {
        throw new PlatformError("FORBIDDEN", "unapproved intake cannot commit");
      }
      claimLease(job, actor.personId, ctx.now);
      if (job.cancelRequested) {
        job.status = job.checkpointChunkIndex >= 0 ? "PARTIALLY_COMMITTED" : "CANCELLED";
        bumpJob(job, ctx.now);
        return { job };
      }
      const candidates = snap.guestIntakeCandidates.filter((item) => item.jobId === job.id);
      const fingerprint = computeApprovalFingerprint({
        jobId: job.id,
        edition: job.edition,
        sourceHash: job.sourceHash ?? "",
        mappingHash: job.mappingHash ?? "",
        candidates,
      });
      if (fingerprint !== job.approvalFingerprint) {
        throw new PlatformError("VALIDATION_FAILED", "stale approval — resubmit and re-approve");
      }
      job.status = "PROMOTING";
      job.progress.phase = "PROMOTING";
      let didWork = false;
      for (let i = 0; i < maxChunks; i += 1) {
        if (job.cancelRequested) break;
        const before = job.checkpointChunkIndex;
        const result = promoteCandidateChunk({
          snap,
          job,
          candidates,
          actorPersonId: actor.personId,
          correlationId: actor.correlationId,
          now: ctx.now,
        });
        if (result.chunk.createdCount + result.chunk.updatedCount + result.chunk.unchangedCount + result.chunk.failedCount === 0 && before === job.checkpointChunkIndex) {
          // no pending rows
          break;
        }
        job.checkpointChunkIndex = result.chunk.sequence;
        job.progress.chunksCommitted = job.checkpointChunkIndex + 1;
        job.progress = summariseProgress(candidates, ctx.now, job.progress);
        job.progress.phase = "PROMOTING";
        didWork = true;
        const remaining = candidates.some((item) => {
          const action = item.decision ?? item.proposedAction;
          return (
            (action === "CREATE" || action === "UPDATE" || action === "UNCHANGED") &&
            !["PROMOTED", "UPDATED", "UNCHANGED", "SKIPPED", "EXCLUDED", "FAILED", "INVALID"].includes(item.status)
          );
        });
        if (!remaining) break;
      }
      const remaining = candidates.some((item) => {
        const action = item.decision ?? item.proposedAction;
        return (
          (action === "CREATE" || action === "UPDATE" || action === "UNCHANGED") &&
          item.status !== "PROMOTED" &&
          item.status !== "UPDATED" &&
          item.status !== "UNCHANGED" &&
          item.status !== "SKIPPED" &&
          item.status !== "EXCLUDED" &&
          item.status !== "FAILED" &&
          item.status !== "INVALID" &&
          item.status !== "CONFLICT_REVIEW"
        );
      });
      if (job.cancelRequested) {
        job.status = "PARTIALLY_COMMITTED";
        bumpJob(job, ctx.now);
        return { job };
      }
      if (remaining) {
        job.status = "PROMOTING";
        bumpJob(job, ctx.now);
        return { job };
      }
      const started = job.progress.startedAt ? Date.parse(job.progress.startedAt) : Date.parse(ctx.now);
      const receipt = buildReceipt({
        job,
        candidates,
        chunksCommitted: Math.max(0, job.checkpointChunkIndex + 1),
        now: ctx.now,
        machineMs: Math.max(0, Date.parse(ctx.now) - started),
      });
      if (!reconciliationBalanced(receipt)) {
        job.status = "FAILED";
        job.failureClass = "RECONCILIATION_MISMATCH";
        job.failureMessage = "Promotion totals did not reconcile.";
        bumpJob(job, ctx.now);
        return { job };
      }
      snap.guestIntakeReceipts.push(receipt);
      snap.guestIntakeOutboxEvents.push({
        id: randomUUID(),
        jobId: job.id,
        organisationId: job.organisationId,
        eventId: job.eventId,
        type: "guest.intake.completed",
        payloadHash: fingerprintParts(receipt.totals),
        status: "PENDING",
        createdAt: ctx.now,
        schemaVersion: SCHEMA_VERSION,
      });
      job.guestTotalAfter = receipt.totals.guestTotalAfter;
      job.progress = summariseProgress(candidates, ctx.now, job.progress);
      job.progress.phase = "COMPLETED";
      const hasExceptions =
        receipt.totals.rejectedRows > 0 || receipt.totals.excludedRows > 0 || receipt.totals.failedRows > 0 || receipt.totals.skippedRows > 0;
      job.status = hasExceptions ? "COMPLETED_WITH_EXCEPTIONS" : "COMPLETED";
      // drop raw file content after completion to reduce retention surface
      const source = snap.guestIntakeSources.find((item) => item.id === job.sourceId);
      if (source?.contentBase64) {
        delete source.contentBase64;
        source.version += 1;
        source.updatedAt = ctx.now;
      }
      bumpJob(job, ctx.now);
      void didWork;
      return { job, receipt };
    },
  });
}

export function cancelGuestIntakeCore(
  mutate: HvMutateFn,
  parseStrict: HvParseStrict,
  actor: { personId: string; correlationId: string; now?: string },
  raw: unknown,
): GuestIntakeJob {
  const input = parseStrict<HvJobActionInput>(HvJobActionInputSchema, raw);
  return mutate(actor, {
    permission: "guest.intake.cancel",
    scope: { organisationId: input.organisationId, eventId: input.eventId },
    action: "guest.intake.cancelled",
    resourceType: "guest_intake_job",
    reason: input.reason,
    idempotencyKey: input.idempotencyKey,
    payloadHash: stableHash({ jobId: input.jobId, expectedVersion: input.expectedVersion, op: "cancel" }),
    run: (snap, ctx) => {
      const job = requireJob(snap, input.jobId);
      assertJobScope(job, input.organisationId, input.eventId);
      if (job.version !== input.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "intake job changed since this view was loaded");
      }
      if (["COMPLETED", "COMPLETED_WITH_EXCEPTIONS", "CANCELLED", "SUPERSEDED"].includes(job.status)) {
        throw new PlatformError("VALIDATION_FAILED", "intake is already terminal");
      }
      job.cancelRequested = true;
      if (job.status === "PROMOTING") {
        job.status = "PAUSED";
      } else if (job.checkpointChunkIndex >= 0) {
        job.status = "PARTIALLY_COMMITTED";
      } else {
        job.status = "CANCELLED";
      }
      bumpJob(job, ctx.now);
      return job;
    },
  });
}

export function listGuestIntakeJobsFromSnap(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
): GuestIntakeJob[] {
  return snap.guestIntakeJobs
    .filter((item) => item.organisationId === organisationId && item.eventId === eventId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getGuestIntakeJobBundle(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  jobId: string,
): {
  job: GuestIntakeJob;
  source?: GuestIntakeSource;
  mapping?: GuestMappingEdition;
  candidates: GuestIntakeCandidate[];
  receipt?: GuestIntakeReceipt;
} {
  const job = requireJob(snap, jobId);
  assertJobScope(job, organisationId, eventId);
  return {
    job,
    source: snap.guestIntakeSources.find((item) => item.id === job.sourceId),
    mapping: snap.guestMappingEditions.find((item) => item.id === job.mappingEditionId),
    candidates: snap.guestIntakeCandidates.filter((item) => item.jobId === job.id).sort((a, b) => a.rowNumber - b.rowNumber),
    receipt: snap.guestIntakeReceipts.find((item) => item.jobId === job.id),
  };
}
