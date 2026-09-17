"use server";

import { redirect } from "next/navigation";
import {
  bindSettlementResult,
  emitSettlementStage,
  platformErrorFromUnknown,
  runWithSettlementTrace,
  safeAttemptedValues,
  formDataToRecord,
  settlementCommandIdFromIdempotency,
  validationFormState,
  type ProtectionFormState,
  type ProtectionFieldErrors,
} from "@maison-doclar/shared-platform";
import { writeActionResult } from "./action-flash";
import { buildActionResult, resultHref, sessionHashFromToken } from "./action-result";
import { classifyActionError } from "./operational-state";
import { runDurableProtectionMutation, writeTruthfulActionResult } from "./protection-form-lifecycle";
import { ensureRuntime, getRuntime, withDurable } from "./runtime";
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

function attemptedFromForm(formData: FormData) {
  return safeAttemptedValues(formDataToRecord(formData));
}

export async function runProtectionFormAction(input: {
  prev: ProtectionFormState;
  formData: FormData;
  scopePath: string;
  actionType: string;
  actor?: Awaited<ReturnType<typeof requireActor>>["actor"];
  trustedScope?: { eventId: string; organisationId: string; scopePath: string };
  parse?: (formData: FormData) => { success: true; data?: unknown } | { success: false; fieldErrors: ProtectionFieldErrors };
  execute: (
    actor: Awaited<ReturnType<typeof requireActor>>["actor"],
    formData: FormData,
  ) => { id?: string } | void | Promise<{ id?: string } | void>;
  subjectFromForm?: (formData: FormData) => { subjectId?: string; attemptedVersion?: number } | undefined;
}): Promise<ProtectionFormState> {
  const attempted = attemptedFromForm(input.formData);
  const requestId = crypto.randomUUID();
  const commandId = settlementCommandIdFromIdempotency(String(input.formData.get("idempotencyKey") ?? ""), requestId);
  const eventId = input.trustedScope?.eventId ?? (String(input.formData.get("eventId") ?? "") || undefined);
  const formScope = {
    eventId: String(input.formData.get("eventId") ?? "") || undefined,
    organisationId: String(input.formData.get("organisationId") ?? "") || undefined,
  };
  const scopePath = input.trustedScope?.scopePath ?? input.scopePath;
  return runWithSettlementTrace({ commandId, requestId, commandType: input.actionType, eventId }, async () => {
    emitSettlementStage({ stage: "HTTP_RECEIVED", commandType: input.actionType, eventId });
    await ensureRuntime();
    const { actor } = input.actor ? { actor: input.actor } : await requireActor();
    const correlationId = actor.correlationId;
    bindSettlementResult(correlationId);
    emitSettlementStage({
      stage: "ACTION_ENTER",
      resultId: correlationId,
      commandType: input.actionType,
      eventId,
    });
    const parsed = input.parse?.(input.formData);
    if (parsed && !parsed.success) {
      return validationFormState({
        fieldErrors: parsed.fieldErrors,
        attemptedValues: attempted.values,
        sensitiveCleared: attempted.sensitiveCleared,
        correlationId,
      });
    }
    try {
      const outcome = await runDurableProtectionMutation(async () => {
        const result = await input.execute(actor, input.formData);
        const effect = getRuntime().service.consumeLastMutationEffect();
        return {
          result,
          application: effect?.application,
          didDataChange: effect?.didDataChange,
        };
      }, withDurable);

      await writeTruthfulActionResult({
        status: "SUCCESS",
        code: "SUCCESS",
        application: outcome.application,
        didDataChange: outcome.didDataChange,
        persist: async () =>
          writeActionResult(
            buildActionResult({
              sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
              actorPersonId: actor.personId,
              scopePath,
              actionType: input.actionType,
              correlationId,
              status: "SUCCESS",
              code: "SUCCESS",
              message: (outcome.application === "REPLAYED"
                ? input.actionType === "seating.rule.activate"
                  ? "No data changed. An equivalent ACTIVE rule already governs this scope."
                  : input.actionType === "seating.export"
                    ? "No new export was created. The existing READY export was reused."
                    : input.actionType === "seating.evaluate"
                      ? "No change. This seating evaluation was already applied."
                      : "No change. This command was already applied."
                : input.actionType === "seating.evaluate"
                  ? (() => {
                      const r = outcome.result as
                        | {
                            status?: string;
                            failedCount?: number;
                            passedCount?: number;
                            caseCount?: number;
                            readinessResult?: string;
                            safeFailureCodes?: string[];
                          }
                        | void;
                      if (r && typeof r === "object" && r.status) {
                        const codes =
                          Array.isArray(r.safeFailureCodes) && r.safeFailureCodes.length
                            ? ` Codes: ${r.safeFailureCodes.join(", ")}.`
                            : "";
                        const next =
                          r.readinessResult === "RELEASE_READY"
                            ? "Seating is release-ready under the current CP-SAT authority. Continue cutover verification."
                            : r.status === "PASSED"
                              ? "Seating evaluation passed but is not release-ready yet. Complete adoption or resolve readiness blockers."
                              : "Seating is not release-ready. Inspect failure codes before treating seating as ready.";
                        return `Seating evaluation completed · ${r.status} · ${r.passedCount ?? 0}/${r.caseCount ?? 0} passed · ${r.readinessResult ?? "BLOCKED"}.${codes} ${next}`;
                      }
                      return "Seating evaluation completed.";
                    })()
                  : "Protection command applied."
              ).slice(0, 400),
              application: outcome.application,
              didDataChange: outcome.didDataChange,
              eventId: input.trustedScope?.eventId ?? formScope.eventId,
              organisationId: input.trustedScope?.organisationId ?? formScope.organisationId,
            }),
          ),
      });
      emitSettlementStage({
        stage: "REDIRECT_EMITTED",
        resultId: correlationId,
        outcome: outcome.application,
        reasonClass: "SUCCESS",
      });
      redirect(
        resultHref(
          scopePath,
          correlationId,
          outcome.result && "id" in (outcome.result ?? {}) ? { subjectId: String((outcome.result as { id?: string }).id ?? "") } : undefined,
        ),
      );
    } catch (error) {
      if (isNextRedirect(error)) {
        emitSettlementStage({
          stage: "HTTP_RESPONSE",
          resultId: correlationId,
          reasonClass: "NEXT_REDIRECT",
        });
        throw error;
      }
    const normalised = platformErrorFromUnknown(error);
    if (normalised.code === "VALIDATION_FAILED") {
      const field = normalised.field === "nextReviewAt" ? "nextReviewOn" : normalised.field ?? "form";
      const message =
        normalised.field && normalised.message && !/invalid uuid|expected |\{|\[/i.test(normalised.message)
          ? normalised.message
          : undefined;
      return validationFormState({
        fieldErrors: {
          [field]:
            message && message !== "The submitted information is not valid."
              ? message.slice(0, 180)
              : field === "insurerPartyId" || field === "vendorId" || field === "form"
                ? field === "vendorId"
                  ? "Choose a vendor from the governed party register."
                  : field === "insurerPartyId"
                    ? "Choose an insurer from the governed party register."
                    : "Correct the highlighted information."
                : "Correct this field and submit once.",
        },
        attemptedValues: attempted.values,
        sensitiveCleared: attempted.sensitiveCleared,
        correlationId,
      });
    }
    const classified = classifyActionError(normalised);
    await writeTruthfulActionResult({
      status: "FAILURE",
      code: classified.code,
      application: "NOT_APPLIED",
      didDataChange: false,
      persist: async () =>
        writeActionResult(
          buildActionResult({
            sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
            actorPersonId: actor.personId,
            scopePath,
            actionType: input.actionType,
            correlationId,
            status: "FAILURE",
            code: classified.code,
            message: classified.message,
            application: "NOT_APPLIED",
            didDataChange: false,
                    eventId: input.trustedScope?.eventId ?? formScope.eventId,
                    organisationId: input.trustedScope?.organisationId ?? formScope.organisationId,
            ...(input.subjectFromForm?.(input.formData) ?? {}),
          }),
        ),
    });
    emitSettlementStage({
      stage: "REDIRECT_EMITTED",
      resultId: correlationId,
      outcome: "NOT_APPLIED",
      reasonClass: classified.code,
    });
    redirect(resultHref(scopePath, correlationId));
    }
  });
}
