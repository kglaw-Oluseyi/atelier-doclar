"use server";

import {
  AssessRiskVendorFormSchema,
  AssignRiskRosterFormSchema,
  CreateContinuityPlanFormSchema,
  CreateRiskClauseTemplateFormSchema,
  CreateRiskPolicyFormSchema,
  CreateRiskRuleFormSchema,
  CreateRiskSourceFormSchema,
  ClassifyFixtureAuthorityFormSchema,
  ExactSelectionWithdrawFormSchema,
  RecordAuthorityReviewFormSchema,
  WithdrawRiskAuthorityFormSchema,
  reviewOnToIso,
  RecordClientDossierMessageFormSchema,
  RecordRiskFactFormSchema,
  ReportIncidentFormSchema,
  parseFormSchema,
  stringListFromForm,
  type ProtectionFormState,
} from "@maison-doclar/shared-platform";
import { writeIssuedAccessFlash } from "./action-flash";
import { runProtectionFormAction } from "./protection-form-action";
import { authorityDetailPathFromForm, envelope, scopePathFromForm } from "./protection-form-helpers";
import { getRuntime } from "./runtime";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

export async function createRiskPolicyAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePathFromForm(formData),
    actionType: "risk.policy.create",
    parse: (data) =>
      parseFormSchema(CreateRiskPolicyFormSchema, {
        organisationId: field(data, "organisationId"),
        eventId: field(data, "eventId") || undefined,
        assignmentId: field(data, "assignmentId"),
        expectedVersion: field(data, "expectedVersion"),
        idempotencyKey: field(data, "idempotencyKey"),
        reason: field(data, "reason") || undefined,
        policyType: field(data, "policyType"),
        insurerPartyId: field(data, "insurerPartyId"),
      }),
    execute: (actor, data) =>
      getRuntime().service.createRiskPolicy(actor, {
        ...envelope(data),
        policyType: field(data, "policyType"),
        insurerPartyId: field(data, "insurerPartyId"),
      }),
  });
}

export async function evaluateRiskEventAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.event.evaluate",
    execute: (actor, data) => getRuntime().service.evaluateRiskEvent(actor, envelope(data)),
  });
}

export async function recordRiskFactAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.fact.record",
    parse: (data) =>
      parseFormSchema(RecordRiskFactFormSchema, {
        ...envelope(data),
        eventId,
        factKey: field(data, "factKey"),
        value: field(data, "value"),
        unknown: field(data, "unknown") === "true" ? "true" : undefined,
      }),
    execute: (actor, data) =>
      getRuntime().service.recordRiskFact(actor, {
        ...envelope(data),
        eventId,
        factKey: field(data, "factKey"),
        value: field(data, "value"),
        unknown: field(data, "unknown") === "true",
      }),
  });
}

export async function submitResidualAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.residual.submit",
    execute: (actor, data) =>
      getRuntime().service.submitRiskResidual(actor, {
        ...envelope(data),
        eventId,
        gapId: field(data, "gapId"),
        choice: field(data, "choice"),
        reason: field(data, "reason"),
      }),
  });
}

export async function decideResidualAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.residual.decide",
    execute: (actor, data) =>
      getRuntime().service.decideRiskResidual(actor, {
        ...envelope(data),
        eventId,
        decisionId: field(data, "decisionId"),
        decision: field(data, "decision"),
      }),
  });
}

export async function authoriseFallbackAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.fallback.authorise",
    execute: (actor, data) =>
      getRuntime().service.authoriseRiskFallback(actor, {
        ...envelope(data),
        eventId,
        activationId: field(data, "activationId"),
        to: "AUTHORISED",
      }),
  });
}

export async function proposeFallbackAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.fallback.propose",
    execute: (actor, data) =>
      getRuntime().service.proposeRiskFallback(actor, {
        ...envelope(data),
        eventId,
        planId: field(data, "planId"),
        triggerEvidence: field(data, "triggerEvidence") || "Manual report",
        impact: field(data, "impact") || "Service continuity at risk",
      }),
  });
}

export async function reportIncidentAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.incident.report",
    parse: (data) =>
      parseFormSchema(ReportIncidentFormSchema, {
        ...envelope(data),
        eventId,
        title: field(data, "title"),
        severity: field(data, "severity"),
        lifeSafety: field(data, "lifeSafety") === "true" ? "true" : undefined,
      }),
    execute: (actor, data) =>
      getRuntime().service.reportRiskIncident(actor, {
        ...envelope(data),
        eventId,
        title: field(data, "title"),
        severity: field(data, "severity"),
        lifeSafety: field(data, "lifeSafety") === "true",
      }),
  });
}

export async function assembleDossierAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.dossier.assemble",
    execute: (actor, data) => getRuntime().service.assembleRiskDossier(actor, { ...envelope(data), eventId }),
  });
}

export async function publishDossierAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.dossier.publish",
    execute: (actor, data) =>
      getRuntime().service.publishRiskDossier(actor, {
        ...envelope(data),
        eventId,
        editionId: field(data, "dossierId"),
        dossierId: field(data, "dossierId"),
        approvedHash: field(data, "approvedHash"),
      }),
  });
}

export async function projectRiskBudgetAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.budget.project",
    execute: (actor, data) => {
      const kind = field(data, "driverKind") || "UNQUANTIFIED_EXPOSURE";
      const evidenceIds = stringListFromForm(data.getAll("evidenceIds").map(String));
      const drivers =
        kind === "INSURANCE_PREMIUM_ASSUMPTION"
          ? [{ kind, money: { currency: field(data, "currency") || "NGN", minor: field(data, "minor") }, evidenceIds, assumptionLabel: field(data, "assumptionLabel") || undefined }]
          : kind === "CONTINUITY_RESERVE"
            ? [{ kind, basis: "BUDGET_PERCENTAGE" as const, value: Number(field(data, "reservePercent") || 5), evidenceIds }]
            : [{ kind: "UNQUANTIFIED_EXPOSURE" as const, reason: field(data, "reason") || "No sourced replacement quote is on file.", evidenceIds }];
      return getRuntime().service.projectRiskBudget(actor, {
        ...envelope(data),
        eventId,
        drivers,
        governingScenarioHash: field(data, "governingScenarioHash") || undefined,
        expectedScenarioVersion: field(data, "expectedScenarioVersion") ? Number(field(data, "expectedScenarioVersion")) : undefined,
      });
    },
  });
}

export async function runS05BEvaluationAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.evaluation.run",
    execute: (actor, data) =>
      getRuntime().service.executeS05BEvaluation(actor, {
        organisationId: field(data, "organisationId"),
        idempotencyKey: field(data, "idempotencyKey") || crypto.randomUUID(),
        reason: "Run S05B fixture assurance",
      }),
  });
}

export async function createContinuityPlanAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.continuity.create",
    parse: (data) =>
      parseFormSchema(CreateContinuityPlanFormSchema, {
        ...envelope(data),
        eventId,
        title: field(data, "title"),
        recoveryObjectiveMinutes: field(data, "recoveryObjectiveMinutes"),
        maximumTolerableInterruptionMinutes: field(data, "maximumTolerableInterruptionMinutes"),
        decisionRole: field(data, "decisionRole") || "EVENT_DIRECTOR",
      }),
    execute: (actor, data) =>
      getRuntime().service.createRiskContinuityPlan(actor, {
        ...envelope(data),
        eventId,
        title: field(data, "title"),
        recoveryObjectiveMinutes: Number(field(data, "recoveryObjectiveMinutes") || 0),
        maximumTolerableInterruptionMinutes: Number(field(data, "maximumTolerableInterruptionMinutes") || 0),
        decisionRole: field(data, "decisionRole") || "EVENT_DIRECTOR",
      }),
  });
}

export async function generateCheckpointsAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.checkpoint.generate",
    execute: (actor, data) => getRuntime().service.generateRiskCheckpoints(actor, { ...envelope(data), eventId }),
  });
}

export async function createRiskPolicyEditionAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePathFromForm(formData),
    actionType: "risk.policy.edition.create",
    execute: (actor, data) => {
      const insured = stringListFromForm(field(data, "insuredPartyLabels"));
      return getRuntime().service.createRiskPolicyEdition(actor, {
        ...envelope(data),
        policyId: field(data, "policyId"),
        policyNumber: field(data, "policyNumber"),
        currency: field(data, "currency") || "NGN",
        period: { startOn: field(data, "startOn"), endOn: field(data, "endOn") },
        limits: [
          {
            coverageKey: field(data, "coverageKey") || "PUBLIC_LIABILITY",
            limit: { currency: field(data, "currency") || "NGN", minor: field(data, "limitMinor") },
            basis: field(data, "limitBasis") || "any one occurrence",
          },
        ],
        deductibles: field(data, "deductibleMinor")
          ? [{ coverageKey: field(data, "coverageKey") || "PUBLIC_LIABILITY", amount: { currency: field(data, "currency") || "NGN", minor: field(data, "deductibleMinor") } }]
          : [],
        insuredPartyLabels: insured,
        documentEditionId: field(data, "documentEditionId"),
        territorialScope: field(data, "territorialScope").trim() || undefined,
        activityScope: field(data, "activityScope").trim() || undefined,
        endorsementNotes: field(data, "endorsementNotes").trim() || undefined,
        exclusionNotes: field(data, "exclusionNotes").trim() || undefined,
        assetInventoryRefs: [],
      });
    },
  });
}

export async function createRiskEvidenceAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.evidence.create",
    execute: (actor, data) =>
      getRuntime().service.createRiskEvidence(actor, {
        ...envelope(data),
        title: field(data, "title"),
        classification: field(data, "classification") || "POLICY_IDENTIFIER",
        originalFilename: field(data, "originalFilename"),
      }),
  });
}

export async function completeRiskEvidenceUploadAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.evidence.upload",
    execute: (actor, data) =>
      getRuntime().service.completeRiskEvidenceUpload(actor, {
        ...envelope(data),
        documentId: field(data, "documentId"),
        objectKey: field(data, "objectKey"),
        byteChecksum: field(data, "byteChecksum"),
        byteLength: Number(field(data, "byteLength") || 0),
        contentType: field(data, "contentType") || "application/pdf",
        scanAdapter: "INACTIVE",
      }),
  });
}

export async function verifyRiskPolicyAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.policy.verify",
    execute: (actor, data) =>
      getRuntime().service.verifyRiskPolicy(actor, {
        ...envelope(data),
        editionId: field(data, "editionId"),
        decision: field(data, "decision") || "VERIFIED",
      }),
  });
}

export async function createRiskSourceAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.source.create",
    parse: (data) =>
      parseFormSchema(CreateRiskSourceFormSchema, {
        ...envelope(data),
        title: field(data, "title"),
        publisher: field(data, "publisher"),
        locator: field(data, "locator"),
        authority: field(data, "authority"),
        jurisdiction: field(data, "jurisdiction"),
        summary: field(data, "summary"),
        nextReviewOn: field(data, "nextReviewOn"),
      }),
    execute: (actor, data) =>
      getRuntime().service.createRiskSource(actor, {
        ...envelope(data),
        title: field(data, "title"),
        publisher: field(data, "publisher"),
        locator: field(data, "locator"),
        authority: field(data, "authority") || "REGULATOR",
        jurisdiction: field(data, "jurisdiction"),
        summary: field(data, "summary"),
        retrievedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        nextReviewAt: reviewOnToIso(field(data, "nextReviewOn")),
      }),
  });
}

export async function approveRiskSourceAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.source.approve",
    execute: (actor, data) =>
      getRuntime().service.approveRiskSource(actor, {
        ...envelope(data),
        sourceId: field(data, "sourceId"),
      }),
  });
}

export async function createRiskRuleAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.rule.create",
    parse: (data) =>
      parseFormSchema(CreateRiskRuleFormSchema, {
        ...envelope(data),
        ruleKey: field(data, "ruleKey"),
        jurisdiction: field(data, "jurisdiction"),
        proposition: field(data, "proposition"),
        sourceEditionIds: data.getAll("sourceEditionIds").map(String).filter(Boolean),
        requirementKey: field(data, "requirementKey"),
        policyType: field(data, "policyType") || undefined,
        mandatory: field(data, "mandatory"),
        nextReviewOn: field(data, "nextReviewOn"),
      }),
    execute: (actor, data) =>
      getRuntime().service.createRiskRule(actor, {
        ...envelope(data),
        ruleKey: field(data, "ruleKey"),
        jurisdiction: field(data, "jurisdiction"),
        proposition: field(data, "proposition"),
        sourceEditionIds: data.getAll("sourceEditionIds").map(String).filter(Boolean),
        requirementKey: field(data, "requirementKey"),
        policyType: field(data, "policyType") || undefined,
        mandatory: field(data, "mandatory") === "true",
        nextReviewAt: reviewOnToIso(field(data, "nextReviewOn")),
      }),
  });
}

export async function reviewRiskRuleAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: authorityDetailPathFromForm(formData),
    actionType: "risk.rule.review",
    execute: (actor, data) =>
      getRuntime().service.reviewRiskRule(actor, {
        ...envelope(data),
        ruleId: field(data, "ruleId"),
        status: field(data, "status") || "APPROVED",
      }),
  });
}

export async function recordAuthorityReviewAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.authority.review",
    parse: (data) =>
      parseFormSchema(RecordAuthorityReviewFormSchema, {
        ...envelope(data),
        targetKind: field(data, "targetKind"),
        reviewAction: field(data, "reviewAction"),
        editionId: field(data, "editionId"),
        nextReviewOn: field(data, "nextReviewOn"),
        reason: field(data, "reason"),
        confirmedHash: field(data, "confirmedHash"),
      }),
    execute: (actor, data) =>
      getRuntime().service.recordRiskAuthorityReview(actor, {
        ...envelope(data),
        targetKind: field(data, "targetKind") as "RULE" | "SOURCE",
        reviewAction: field(data, "reviewAction") as "RECORD_CURRENT_REVIEW" | "CREATE_REVIEW_SUCCESSOR",
        editionId: field(data, "editionId"),
        nextReviewAt: reviewOnToIso(field(data, "nextReviewOn")),
        reason: field(data, "reason"),
        confirmedHash: field(data, "confirmedHash"),
      }),
  });
}

export async function createRiskClauseTemplateAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.clause.template.create",
    parse: (data) =>
      parseFormSchema(CreateRiskClauseTemplateFormSchema, {
        ...envelope(data),
        family: field(data, "family"),
        title: field(data, "title"),
        jurisdiction: field(data, "jurisdiction"),
        body: field(data, "body"),
        variableKeys: field(data, "variableKeys") || undefined,
      }),
    execute: (actor, data) =>
      getRuntime().service.createRiskClauseTemplate(actor, {
        ...envelope(data),
        family: field(data, "family") || "RETENTION",
        title: field(data, "title"),
        jurisdiction: field(data, "jurisdiction"),
        body: field(data, "body"),
        variables: field(data, "variableKeys")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((key) => ({ key, label: key, kind: "TEXT" as const })),
      }),
  });
}

export async function applyRiskClauseAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePathFromForm(formData),
    actionType: "risk.clause.apply",
    execute: (actor, data) =>
      getRuntime().service.applyRiskClause(actor, {
        ...envelope(data),
        templateId: field(data, "templateId") || undefined,
        family: field(data, "family") || "RETENTION",
        jurisdiction: field(data, "jurisdiction"),
        language: field(data, "language") || "en",
        body: field(data, "body") || undefined,
        variables: field(data, "variableValues")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((pair) => {
            const [key, value] = pair.split("=");
            return { key: (key ?? "").trim(), value: (value ?? "").trim() };
          }),
      }),
  });
}

export async function reviewRiskClauseAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.clause.review",
    execute: (actor, data) =>
      getRuntime().service.reviewRiskClause(actor, {
        ...envelope(data),
        editionId: field(data, "editionId"),
        gate: field(data, "gate") || "LEGAL",
        decision: field(data, "decision") || "APPROVED",
      }),
  });
}

export async function assessRiskVendorAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePathFromForm(formData),
    actionType: "risk.vendor.assess",
    parse: (data) =>
      parseFormSchema(AssessRiskVendorFormSchema, {
        ...envelope(data),
        vendorId: field(data, "vendorId"),
      }),
    execute: (actor, data) =>
      getRuntime().service.assessRiskVendor(actor, {
        ...envelope(data),
        vendorId: field(data, "vendorId"),
      }),
  });
}

export async function decideRiskVendorAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePathFromForm(formData),
    actionType: "risk.vendor.decide",
    execute: (actor, data) =>
      getRuntime().service.decideRiskVendor(actor, {
        ...envelope(data),
        assessmentId: field(data, "assessmentId"),
        decision: field(data, "decision") || "RESTRICTED",
        reason: field(data, "reason"),
      }),
  });
}

export async function assignRiskRosterAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.roster.assign",
    parse: (data) =>
      parseFormSchema(AssignRiskRosterFormSchema, {
        ...envelope(data),
        eventId,
        vendorId: field(data, "vendorId"),
        vendorLabel: field(data, "vendorLabel") || undefined,
        role: field(data, "role"),
        criticalFunctionKey: field(data, "criticalFunctionKey"),
        commercialStatus: field(data, "commercialStatus"),
      }),
    execute: (actor, data) =>
      getRuntime().service.assignRiskRoster(actor, {
        ...envelope(data),
        eventId,
        vendorId: field(data, "vendorId"),
        vendorLabel: field(data, "vendorLabel") || undefined,
        role: field(data, "role") || "STANDBY",
        criticalFunctionKey: field(data, "criticalFunctionKey"),
        commercialStatus: field(data, "commercialStatus") || "UNCONFIRMED",
      }),
  });
}

export async function submitDossierAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.dossier.submit",
    execute: (actor, data) =>
      getRuntime().service.transitionRiskDossier(actor, {
        ...envelope(data),
        eventId,
        dossierId: field(data, "dossierId"),
        to: "SUBMITTED",
      }),
  });
}

export async function approveDossierAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.dossier.approve",
    execute: (actor, data) =>
      getRuntime().service.transitionRiskDossier(actor, {
        ...envelope(data),
        eventId,
        dossierId: field(data, "dossierId"),
        to: "APPROVED",
      }),
  });
}

export async function exportDossierAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.dossier.export",
    execute: (actor, data) =>
      getRuntime().service.exportRiskDossier(actor, {
        ...envelope(data),
        eventId,
        dossierId: field(data, "dossierId"),
      }),
  });
}

export async function recordClientDossierMessageAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection/client`,
    actionType: "risk.dossier.client-message",
    parse: (data) =>
      parseFormSchema(RecordClientDossierMessageFormSchema, {
        ...envelope(data),
        eventId,
        kind: field(data, "kind") || "QUESTION",
        body: field(data, "body"),
      }),
    execute: (actor, data) =>
      getRuntime().service.recordClientDossierMessage(actor, {
        ...envelope(data),
        eventId,
        kind: field(data, "kind") || "QUESTION",
        body: field(data, "body"),
      }),
  });
}

export async function recordCheckInAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.checkpoint.checkin",
    execute: (actor, data) =>
      getRuntime().service.recordRiskCheckIn(actor, {
        ...envelope(data),
        eventId,
        checkpointId: field(data, "checkpointId"),
        response: field(data, "response") || "CONFIRMED",
        source: "STAFF",
        note: field(data, "note") || undefined,
      }),
  });
}

export async function evaluateCheckpointEscalationsAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.checkpoint.escalate",
    execute: (actor, data) => getRuntime().service.evaluateRiskEscalations(actor, { ...envelope(data), eventId }),
  });
}

export async function addIncidentEntryAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.incident.entry",
    execute: (actor, data) =>
      getRuntime().service.addRiskIncidentEntry(actor, {
        ...envelope(data),
        eventId,
        incidentId: field(data, "incidentId"),
        kind: field(data, "kind") || "OBSERVED_FACT",
        body: field(data, "body"),
        sourceLabel: field(data, "sourceLabel") || undefined,
        confidence: field(data, "confidence") || "UNKNOWN",
      }),
  });
}

export async function proposeLearningAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.learning.propose",
    execute: (actor, data) =>
      getRuntime().service.proposeRiskLearning(actor, {
        ...envelope(data),
        eventId,
        incidentId: field(data, "incidentId"),
        target: field(data, "target") || "RULE",
        proposal: field(data, "proposal"),
      }),
  });
}

export async function decideLearningAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.learning.decide",
    execute: (actor, data) =>
      getRuntime().service.decideRiskLearning(actor, {
        ...envelope(data),
        eventId,
        proposalId: field(data, "proposalId"),
        status: field(data, "status") || "APPROVED",
        reason: field(data, "reason") || undefined,
      }),
  });
}

export async function issueDossierAccessAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.dossier.client_access.issue",
    execute: async (actor, data) => {
      const issued = getRuntime().service.issueRiskDossierAccess(actor, { ...envelope(data), eventId });
      await writeIssuedAccessFlash({ kind: "dossier", token: issued.token, subjectId: issued.id });
      return issued;
    },
  });
}

export async function revokeDossierAccessAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = field(formData, "eventId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/protection`,
    actionType: "risk.dossier.client_access.revoke",
    execute: (actor, data) =>
      getRuntime().service.revokeRiskDossierAccess(actor, {
        ...envelope(data),
        eventId,
        grantId: field(data, "grantId"),
      }),
  });
}

export async function withdrawRiskAuthorityAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const editionId = field(formData, "ruleId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/protection/authority/${editionId}`,
    actionType: "risk.rule.withdraw",
    parse: (data) =>
      parseFormSchema(WithdrawRiskAuthorityFormSchema, {
        ...envelope(data),
        ruleId: field(data, "ruleId"),
        confirmedHash: field(data, "confirmedHash"),
        reason: field(data, "reason"),
      }),
    execute: (actor, data) =>
      getRuntime().service.withdrawRiskRuleAuthority(actor, {
        ...envelope(data),
        ruleId: field(data, "ruleId"),
        confirmedHash: field(data, "confirmedHash"),
        reason: field(data, "reason"),
      }),
  });
}

export async function classifyFixtureAuthorityAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const editionId = field(formData, "editionId");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/protection/authority/${editionId}`,
    actionType: "risk.fixture.classify",
    parse: (data) =>
      parseFormSchema(ClassifyFixtureAuthorityFormSchema, {
        ...envelope(data),
        editionId: field(data, "editionId"),
        confirmedHash: field(data, "confirmedHash"),
        testRunId: field(data, "testRunId"),
        authorityPromptId: field(data, "authorityPromptId"),
        lineage: field(data, "lineage"),
        createdByAutomation: field(data, "createdByAutomation") === "true" ? "true" : "false",
      }),
    execute: (actor, data) =>
      getRuntime().service.classifyRiskFixtureAuthority(actor, {
        ...envelope(data),
        bindings: [
          {
            editionId: field(data, "editionId"),
            editionKind: "RULE" as const,
            contentHash: field(data, "confirmedHash"),
            expectedVersion: Number(field(data, "expectedVersion") || 0),
          },
        ],
        provenance: {
          environment: "NON_PRODUCTION_FIXTURE" as const,
          testRunId: field(data, "testRunId"),
          authorityPromptId: field(data, "authorityPromptId"),
          createdByAutomation: field(data, "createdByAutomation") === "true",
        },
        lineage: field(data, "lineage"),
      }),
  });
}

export async function withdrawExactSelectionAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection/authority",
    actionType: "risk.rule.withdraw.batch",
    parse: (data) =>
      parseFormSchema(ExactSelectionWithdrawFormSchema, {
        ...envelope(data),
        selections: field(data, "selections"),
        reason: field(data, "reason"),
      }),
    execute: (actor, data) => {
      const parsed = JSON.parse(field(data, "selections") || "[]") as Array<{ editionId: string; expectedVersion: number; contentHash: string }>;
      if (!Array.isArray(parsed) || parsed.some((item) => !item.editionId || !item.contentHash || !item.expectedVersion)) {
        throw new Error("exact edition bindings are required");
      }
      return getRuntime().service.withdrawExactRiskAuthorities(actor, {
        ...envelope(data),
        selections: parsed,
        reason: field(data, "reason"),
      });
    },
  });
}

export async function decideResidualQueueAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: "/app/protection",
    actionType: "risk.residual.decide",
    execute: (actor, data) =>
      getRuntime().service.decideRiskResidual(actor, {
        ...envelope(data),
        decisionId: field(data, "decisionId"),
        decision: field(data, "decision") || "APPROVED",
      }),
  });
}
