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
  const scopePath = "/app/protection";
  return runRiskAction(scopePath, "risk.policy.create", (actor) =>
    getRuntime().service.createRiskPolicy(actor, {
      ...envelope(formData),
      policyType: String(formData.get("policyType") ?? "PUBLIC_LIABILITY"),
      insurerPartyId: String(formData.get("insurerPartyId") || "00000000-0000-4000-8000-000000000202"),
      insurerLabel: String(formData.get("insurerLabel") ?? "Synthetic insurer"),
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
      factKey: String(formData.get("factKey") ?? "jurisdiction"),
      value: String(formData.get("value") ?? "UNKNOWN"),
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
      choice: String(formData.get("choice") ?? "KEEP_UNRESOLVED"),
      reason: String(formData.get("reason") ?? "Recorded from Protection workspace"),
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
      title: String(formData.get("title") ?? "Incident"),
      severity: String(formData.get("severity") ?? "MEDIUM"),
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
    }),
  );
}

export async function projectRiskBudgetAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.budget.project", (actor) =>
    getRuntime().service.projectRiskBudget(actor, {
      ...envelope(formData),
      eventId,
      drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "No sourced replacement quote is on file.", evidenceIds: [] }],
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
      title: String(formData.get("title") ?? "Continuity plan"),
      recoveryObjectiveMinutes: Number(formData.get("recoveryObjectiveMinutes") ?? 60),
      maximumTolerableInterruptionMinutes: Number(formData.get("maximumTolerableInterruptionMinutes") ?? 120),
      decisionRole: "EVENT_DIRECTOR",
    }),
  );
}

export async function generateCheckpointsAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  return runRiskAction(`/app/events/${eventId}/protection`, "risk.checkpoint.generate", (actor) => getRuntime().service.generateRiskCheckpoints(actor, { ...envelope(formData), eventId }));
}
