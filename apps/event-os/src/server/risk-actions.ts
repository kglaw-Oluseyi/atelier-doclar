"use server";

import { redirect } from "next/navigation";
import { writeActionResult } from "./action-flash";
import { buildActionResult, resultHref, sessionHashFromToken } from "./action-result";
import { classifyActionError } from "./operational-state";
import { getRuntime, withDurable } from "./runtime";
import { readStaffSessionCookie } from "./staff-session-cookie";
import { requireActor } from "./with-session";

function isNextRedirect(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

async function runRiskAction(scopePath: string, actionType: string, execute: (actor: Awaited<ReturnType<typeof requireActor>>["actor"]) => { id?: string } | void): Promise<void> {
  return await withDurable(async () => {
    const { actor } = await requireActor();
    const correlationId = actor.correlationId;
    try {
      const result = execute(actor);
      const effect = getRuntime().service.consumeLastMutationEffect();
      await writeActionResult(
        buildActionResult({
          sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
          actorPersonId: actor.personId,
          scopePath,
          actionType,
          correlationId,
          status: "SUCCESS",
          code: "SUCCESS",
          message: (effect?.application === "REPLAYED" ? "No change. This command was already applied." : "Protection command applied.").slice(0, 400),
          application: effect?.application,
          didDataChange: effect?.didDataChange,
        }),
      );
      redirect(resultHref(scopePath, correlationId, result && "id" in (result ?? {}) ? { subjectId: String((result as { id?: string }).id ?? "") } : undefined));
    } catch (error) {
      if (isNextRedirect(error)) throw error;
      const classified = classifyActionError(error);
      await writeActionResult(
        buildActionResult({
          sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
          actorPersonId: actor.personId,
          scopePath,
          actionType,
          correlationId,
          status: "FAILURE",
          code: classified.code,
          message: classified.message,
        }),
      );
      redirect(resultHref(scopePath, correlationId));
    }
  });
}

function envelope(formData: FormData) {
  return {
    organisationId: String(formData.get("organisationId") ?? ""),
    eventId: String(formData.get("eventId") ?? "") || undefined,
    assignmentId: String(formData.get("assignmentId") ?? ""),
    expectedVersion: Number(formData.get("expectedVersion") ?? 0),
    idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  };
}

export async function createRiskPolicyAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const scopePath = eventId ? `/app/events/${eventId}/protection` : "/app/protection";
  return runRiskAction(scopePath, "risk.policy.create", (actor) =>
    getRuntime().service.createRiskPolicy(actor, {
      ...envelope(formData),
      policyType: String(formData.get("policyType") ?? ""),
      insurerPartyId: String(formData.get("insurerPartyId") ?? ""),
      insurerLabel: String(formData.get("insurerLabel") ?? ""),
    }),
  );
}

export async function evaluateRiskEventAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.event.evaluate", (actor) => getRuntime().service.evaluateRiskEvent(actor, envelope(formData)));
}

export async function recordRiskFactAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.fact.record", (actor) =>
    getRuntime().service.recordRiskFact(actor, {
      ...envelope(formData),
      eventId,
      factKey: String(formData.get("factKey") ?? ""),
      value: String(formData.get("value") ?? ""),
      unknown: String(formData.get("unknown") ?? "") === "true",
    }),
  );
}

export async function submitResidualAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.residual.submit", (actor) =>
    getRuntime().service.submitRiskResidual(actor, {
      ...envelope(formData),
      eventId,
      gapId: String(formData.get("gapId") ?? ""),
      choice: String(formData.get("choice") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    }),
  );
}

export async function decideResidualAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.residual.decide", (actor) =>
    getRuntime().service.decideRiskResidual(actor, {
      ...envelope(formData),
      eventId,
      decisionId: String(formData.get("decisionId") ?? ""),
      decision: String(formData.get("decision") ?? "APPROVED"),
    }),
  );
}

export async function authoriseFallbackAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.fallback.authorise", (actor) =>
    getRuntime().service.authoriseRiskFallback(actor, {
      ...envelope(formData),
      eventId,
      activationId: String(formData.get("activationId") ?? ""),
      to: "AUTHORISED",
    }),
  );
}

export async function proposeFallbackAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.fallback.propose", (actor) =>
    getRuntime().service.proposeRiskFallback(actor, {
      ...envelope(formData),
      eventId,
      planId: String(formData.get("planId") ?? ""),
      triggerEvidence: String(formData.get("triggerEvidence") ?? "Manual report"),
      impact: String(formData.get("impact") ?? "Service continuity at risk"),
    }),
  );
}

export async function reportIncidentAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.incident.report", (actor) =>
    getRuntime().service.reportRiskIncident(actor, {
      ...envelope(formData),
      eventId,
      title: String(formData.get("title") ?? ""),
      severity: String(formData.get("severity") ?? ""),
      lifeSafety: String(formData.get("lifeSafety") ?? "") === "true",
    }),
  );
}

export async function assembleDossierAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.dossier.assemble", (actor) => getRuntime().service.assembleRiskDossier(actor, { ...envelope(formData), eventId }));
}

export async function publishDossierAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.dossier.publish", (actor) =>
    getRuntime().service.transitionRiskDossier(actor, {
      ...envelope(formData),
      eventId,
      dossierId: String(formData.get("dossierId") ?? ""),
      to: "PUBLISHED",
      approvedHash: String(formData.get("approvedHash") ?? ""),
    }),
  );
}

export async function projectRiskBudgetAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const kind = String(formData.get("driverKind") ?? "UNQUANTIFIED_EXPOSURE");
  const evidenceIds = String(formData.get("evidenceIds") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const drivers =
    kind === "INSURANCE_PREMIUM_ASSUMPTION"
      ? [{ kind, money: { currency: String(formData.get("currency") ?? "NGN"), minor: String(formData.get("minor") ?? "") }, evidenceIds, assumptionLabel: String(formData.get("assumptionLabel") ?? "") || undefined }]
      : kind === "CONTINUITY_RESERVE"
        ? [{ kind, basis: "BUDGET_PERCENTAGE" as const, value: Number(formData.get("reservePercent") ?? 5), evidenceIds }]
        : [{ kind: "UNQUANTIFIED_EXPOSURE" as const, reason: String(formData.get("reason") ?? "No sourced replacement quote is on file."), evidenceIds }];
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.budget.project", (actor) =>
    getRuntime().service.projectRiskBudget(actor, {
      ...envelope(formData),
      eventId,
      drivers,
      governingScenarioHash: String(formData.get("governingScenarioHash") ?? "") || undefined,
      expectedScenarioVersion: String(formData.get("expectedScenarioVersion") ?? "") ? Number(formData.get("expectedScenarioVersion")) : undefined,
    }),
  );
}

export async function runS05BEvaluationAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.evaluation.run", (actor) =>
    getRuntime().service.executeS05BEvaluation(actor, {
      organisationId: String(formData.get("organisationId") ?? ""),
      idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
      reason: "Run S05B fixture assurance",
    }),
  );
}

export async function createContinuityPlanAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.continuity.create", (actor) =>
    getRuntime().service.createRiskContinuityPlan(actor, {
      ...envelope(formData),
      eventId,
      title: String(formData.get("title") ?? ""),
      recoveryObjectiveMinutes: Number(formData.get("recoveryObjectiveMinutes") ?? 0),
      maximumTolerableInterruptionMinutes: Number(formData.get("maximumTolerableInterruptionMinutes") ?? 0),
      decisionRole: String(formData.get("decisionRole") ?? "EVENT_DIRECTOR"),
    }),
  );
}

export async function generateCheckpointsAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.checkpoint.generate", (actor) => getRuntime().service.generateRiskCheckpoints(actor, { ...envelope(formData), eventId }));
}

export async function createRiskPolicyEditionAction(formData: FormData): Promise<void> {
  const scopePath = String(formData.get("eventId") ?? "") ? `/app/events/${String(formData.get("eventId"))}/protection` : "/app/protection";
  const insured = String(formData.get("insuredPartyLabels") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const assets = String(formData.get("assetInventoryRefs") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return runRiskAction(scopePath, "risk.policy.edition.create", (actor) =>
    getRuntime().service.createRiskPolicyEdition(actor, {
      ...envelope(formData),
      policyId: String(formData.get("policyId") ?? ""),
      policyNumber: String(formData.get("policyNumber") ?? ""),
      currency: String(formData.get("currency") ?? "NGN"),
      period: { startOn: String(formData.get("startOn") ?? ""), endOn: String(formData.get("endOn") ?? "") },
      limits: [
        {
          coverageKey: String(formData.get("coverageKey") ?? "PUBLIC_LIABILITY"),
          limit: { currency: String(formData.get("currency") ?? "NGN"), minor: String(formData.get("limitMinor") ?? "") },
          basis: String(formData.get("limitBasis") ?? "any one occurrence"),
        },
      ],
      deductibles: String(formData.get("deductibleMinor") ?? "")
        ? [{ coverageKey: String(formData.get("coverageKey") ?? "PUBLIC_LIABILITY"), amount: { currency: String(formData.get("currency") ?? "NGN"), minor: String(formData.get("deductibleMinor") ?? "") } }]
        : [],
      insuredPartyLabels: insured,
      documentEditionId: String(formData.get("documentEditionId") ?? ""),
      territorialScope: String(formData.get("territorialScope") ?? "").trim() || undefined,
      activityScope: String(formData.get("activityScope") ?? "").trim() || undefined,
      endorsementNotes: String(formData.get("endorsementNotes") ?? "").trim() || undefined,
      exclusionNotes: String(formData.get("exclusionNotes") ?? "").trim() || undefined,
      assetInventoryRefs: assets,
    }),
  );
}

export async function createRiskEvidenceAction(formData: FormData): Promise<void> {
  const scopePath = "/app/protection";
  return runRiskAction(scopePath, "risk.evidence.create", (actor) =>
    getRuntime().service.createRiskEvidence(actor, {
      ...envelope(formData),
      title: String(formData.get("title") ?? ""),
      classification: String(formData.get("classification") ?? "POLICY_IDENTIFIER"),
      originalFilename: String(formData.get("originalFilename") ?? ""),
    }),
  );
}

export async function completeRiskEvidenceUploadAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.evidence.upload", (actor) =>
    getRuntime().service.completeRiskEvidenceUpload(actor, {
      ...envelope(formData),
      documentId: String(formData.get("documentId") ?? ""),
      objectKey: String(formData.get("objectKey") ?? ""),
      byteChecksum: String(formData.get("byteChecksum") ?? ""),
      byteLength: Number(formData.get("byteLength") ?? 0),
      contentType: String(formData.get("contentType") ?? "application/pdf"),
      scanAdapter: "INACTIVE",
    }),
  );
}

export async function verifyRiskPolicyAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.policy.verify", (actor) =>
    getRuntime().service.verifyRiskPolicy(actor, {
      ...envelope(formData),
      editionId: String(formData.get("editionId") ?? ""),
      decision: String(formData.get("decision") ?? "VERIFIED"),
    }),
  );
}

export async function createRiskSourceAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.source.create", (actor) =>
    getRuntime().service.createRiskSource(actor, {
      ...envelope(formData),
      title: String(formData.get("title") ?? ""),
      publisher: String(formData.get("publisher") ?? ""),
      locator: String(formData.get("locator") ?? ""),
      authority: String(formData.get("authority") ?? "REGULATOR"),
      jurisdiction: String(formData.get("jurisdiction") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      retrievedAt: String(formData.get("retrievedAt") ?? new Date().toISOString()),
      lastVerifiedAt: String(formData.get("lastVerifiedAt") ?? new Date().toISOString()),
      nextReviewAt: String(formData.get("nextReviewAt") ?? new Date().toISOString()),
    }),
  );
}

export async function approveRiskSourceAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.source.approve", (actor) =>
    getRuntime().service.approveRiskSource(actor, {
      ...envelope(formData),
      sourceId: String(formData.get("sourceId") ?? ""),
    }),
  );
}

export async function createRiskRuleAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.rule.create", (actor) =>
    getRuntime().service.createRiskRule(actor, {
      ...envelope(formData),
      ruleKey: String(formData.get("ruleKey") ?? ""),
      jurisdiction: String(formData.get("jurisdiction") ?? ""),
      proposition: String(formData.get("proposition") ?? ""),
      sourceEditionIds: String(formData.get("sourceEditionIds") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      requirementKey: String(formData.get("requirementKey") ?? ""),
      policyType: String(formData.get("policyType") ?? "") || undefined,
      mandatory: String(formData.get("mandatory") ?? "") === "true",
    }),
  );
}

export async function reviewRiskRuleAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.rule.review", (actor) =>
    getRuntime().service.reviewRiskRule(actor, {
      ...envelope(formData),
      ruleId: String(formData.get("ruleId") ?? ""),
      status: String(formData.get("status") ?? "APPROVED"),
    }),
  );
}

export async function createRiskClauseTemplateAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.clause.template.create", (actor) =>
    getRuntime().service.createRiskClauseTemplate(actor, {
      ...envelope(formData),
      family: String(formData.get("family") ?? "RETENTION"),
      title: String(formData.get("title") ?? ""),
      jurisdiction: String(formData.get("jurisdiction") ?? ""),
      body: String(formData.get("body") ?? ""),
      variables: String(formData.get("variableKeys") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((key) => ({ key, label: key, kind: "TEXT" as const })),
    }),
  );
}

export async function applyRiskClauseAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const scopePath = eventId ? `/app/events/${eventId}/protection` : "/app/protection";
  return runRiskAction(scopePath, "risk.clause.apply", (actor) =>
    getRuntime().service.applyRiskClause(actor, {
      ...envelope(formData),
      templateId: String(formData.get("templateId") ?? "") || undefined,
      family: String(formData.get("family") ?? "RETENTION"),
      jurisdiction: String(formData.get("jurisdiction") ?? ""),
      language: String(formData.get("language") ?? "en"),
      body: String(formData.get("body") ?? "") || undefined,
      variables: String(formData.get("variableValues") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((pair) => {
          const [key, value] = pair.split("=");
          return { key: (key ?? "").trim(), value: (value ?? "").trim() };
        }),
    }),
  );
}

export async function reviewRiskClauseAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.clause.review", (actor) =>
    getRuntime().service.reviewRiskClause(actor, {
      ...envelope(formData),
      editionId: String(formData.get("editionId") ?? ""),
      gate: String(formData.get("gate") ?? "LEGAL"),
      decision: String(formData.get("decision") ?? "APPROVED"),
    }),
  );
}

export async function assessRiskVendorAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const scopePath = eventId ? `/app/events/${eventId}/protection` : "/app/protection";
  return runRiskAction(scopePath, "risk.vendor.assess", (actor) =>
    getRuntime().service.assessRiskVendor(actor, {
      ...envelope(formData),
      vendorId: String(formData.get("vendorId") ?? ""),
    }),
  );
}

export async function decideRiskVendorAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const scopePath = eventId ? `/app/events/${eventId}/protection` : "/app/protection";
  return runRiskAction(scopePath, "risk.vendor.decide", (actor) =>
    getRuntime().service.decideRiskVendor(actor, {
      ...envelope(formData),
      assessmentId: String(formData.get("assessmentId") ?? ""),
      decision: String(formData.get("decision") ?? "RESTRICTED"),
      reason: String(formData.get("reason") ?? ""),
    }),
  );
}

export async function assignRiskRosterAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.roster.assign", (actor) =>
    getRuntime().service.assignRiskRoster(actor, {
      ...envelope(formData),
      eventId,
      vendorId: String(formData.get("vendorId") ?? ""),
      vendorLabel: String(formData.get("vendorLabel") ?? ""),
      role: String(formData.get("role") ?? "STANDBY"),
      criticalFunctionKey: String(formData.get("criticalFunctionKey") ?? ""),
      commercialStatus: String(formData.get("commercialStatus") ?? "UNCONFIRMED"),
    }),
  );
}

export async function submitDossierAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.dossier.submit", (actor) =>
    getRuntime().service.transitionRiskDossier(actor, {
      ...envelope(formData),
      eventId,
      dossierId: String(formData.get("dossierId") ?? ""),
      to: "SUBMITTED",
    }),
  );
}

export async function approveDossierAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.dossier.approve", (actor) =>
    getRuntime().service.transitionRiskDossier(actor, {
      ...envelope(formData),
      eventId,
      dossierId: String(formData.get("dossierId") ?? ""),
      to: "APPROVED",
    }),
  );
}

export async function exportDossierAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.dossier.export", (actor) =>
    getRuntime().service.exportRiskDossier(actor, {
      ...envelope(formData),
      eventId,
      dossierId: String(formData.get("dossierId") ?? ""),
    }),
  );
}

export async function recordClientDossierMessageAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection/client`, "risk.dossier.client-message", (actor) =>
    getRuntime().service.recordClientDossierMessage(actor, {
      ...envelope(formData),
      eventId,
      kind: String(formData.get("kind") ?? "QUESTION"),
      body: String(formData.get("body") ?? ""),
    }),
  );
}

export async function decideResidualQueueAction(formData: FormData): Promise<void> {
  return runRiskAction("/app/protection", "risk.residual.decide", (actor) =>
    getRuntime().service.decideRiskResidual(actor, {
      ...envelope(formData),
      decisionId: String(formData.get("decisionId") ?? ""),
      decision: String(formData.get("decision") ?? "APPROVED"),
    }),
  );
}
