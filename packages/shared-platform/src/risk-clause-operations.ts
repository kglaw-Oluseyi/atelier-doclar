import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import {
  assertExpectedVersion,
  assertHumanActor,
  assertMakerChecker,
  assertSameEvent,
  assertSameOrganisation,
  bumpVersion,
  escapeClauseValue,
  newRiskId,
  extractRiskEnvelope,
  renderClauseBody,
  riskStamp,
} from "./risk-command.js";
import {
  RiskClauseEditionSchema,
  RiskClauseTemplateSchema,
  type RiskClauseEdition,
  type RiskClauseTemplate,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

function envelope(raw: unknown, organisationId: string, eventId?: string) {
  const parsed = extractRiskEnvelope(raw);
  assertSameOrganisation(parsed.organisationId, organisationId);
  assertSameEvent(parsed.eventId, eventId);
  return parsed;
}

export function createClauseTemplateOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    family: RiskClauseTemplate["family"];
    title: string;
    jurisdiction: string;
    body: string;
    variables: RiskClauseTemplate["variables"];
    aiProposed?: boolean;
  },
  now: string,
  actorPersonId: string,
): RiskClauseTemplate {
  envelope(input, input.organisationId);
  const record = RiskClauseTemplateSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    family: input.family,
    title: input.title,
    jurisdiction: input.jurisdiction,
    body: input.body,
    variables: input.variables,
    status: "DRAFT",
    aiProposed: Boolean(input.aiProposed),
    createdByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskClauseTemplates.push(record);
  return record;
}

export function applyClauseEditionOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId?: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    templateId?: string;
    family: RiskClauseEdition["family"];
    jurisdiction: string;
    language: string;
    body?: string;
    variables: Array<{ key: string; value: string }>;
    vendorId?: string;
    aiProposed?: boolean;
    retentionBasisPoints?: number;
    liquidatedDamagesMultiplier?: number;
  },
  now: string,
  actorPersonId: string,
): RiskClauseEdition {
  envelope(input, input.organisationId, input.eventId);
  const template = input.templateId
    ? snap.riskClauseTemplates.find((item) => item.id === input.templateId && item.organisationId === input.organisationId)
    : undefined;
  if (input.templateId && !template) throw new PlatformError("NOT_FOUND", "clause template not found");
  const body = input.body ?? template?.body;
  if (!body) throw new PlatformError("VALIDATION_FAILED", "clause body or approved template is required");
  const rendered = renderClauseBody(body, input.variables);
  if (/enforceable penalty|legally binding penalty/i.test(rendered)) {
    throw new PlatformError("VALIDATION_FAILED", "the platform must not promise enforceability");
  }
  const record = RiskClauseEditionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    clauseId: template?.id ?? newRiskId(),
    family: input.family,
    jurisdiction: input.jurisdiction,
    language: input.language,
    body,
    renderedBody: rendered,
    variables: input.variables,
    sourceTemplateEditionId: template?.id,
    vendorId: input.vendorId,
    legalReviewStatus: "NOT_REVIEWED",
    commercialApprovalStatus: "PENDING",
    aiProposed: Boolean(input.aiProposed),
    enforceabilityClaimed: false,
    contentHash: exactHash({ body, variables: input.variables, family: input.family }),
    submittedByPersonId: actorPersonId,
    current: true,
    ...riskStamp(now),
  });
  snap.riskClauseEditions.push(record);
  return record;
}

export function reviewClauseEditionOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    editionId: string;
    gate: "LEGAL" | "COMMERCIAL";
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskClauseEdition {
  envelope(input, input.organisationId);
  assertHumanActor(actorKind);
  const edition = snap.riskClauseEditions.find((item) => item.id === input.editionId && item.organisationId === input.organisationId);
  if (!edition) throw new PlatformError("NOT_FOUND", "clause edition not found");
  assertExpectedVersion(edition.version, input.expectedVersion, "clause edition");
  assertMakerChecker(edition.submittedByPersonId, actorPersonId, "approve clause");
  const next =
    input.gate === "LEGAL"
      ? {
          legalReviewStatus: input.decision === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED",
          legalReviewerPersonId: actorPersonId,
        }
      : {
          commercialApprovalStatus: input.decision === "APPROVED" ? "APPROVED" : "REJECTED",
          commercialApproverPersonId: actorPersonId,
        };
  Object.assign(edition, RiskClauseEditionSchema.parse({ ...edition, ...next, ...bumpVersion(edition, now) }));
  return edition;
}

export function safeguardProjection(edition: RiskClauseEdition): {
  family: string;
  reviewed: boolean;
  paymentInitiated: false;
  enforceabilityClaimed: false;
  renderedBody: string;
} {
  return {
    family: edition.family,
    reviewed: edition.legalReviewStatus === "APPROVED" && edition.commercialApprovalStatus === "APPROVED",
    paymentInitiated: false,
    enforceabilityClaimed: false,
    renderedBody: escapeClauseValue(edition.renderedBody),
  };
}
