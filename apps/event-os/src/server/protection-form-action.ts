"use server";

import { redirect } from "next/navigation";
import {
  platformErrorFromUnknown,
  safeAttemptedValues,
  formDataToRecord,
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
  parse?: (formData: FormData) => { success: true; data?: unknown } | { success: false; fieldErrors: ProtectionFieldErrors };
  execute: (
    actor: Awaited<ReturnType<typeof requireActor>>["actor"],
    formData: FormData,
  ) => { id?: string } | void | Promise<{ id?: string } | void>;
}): Promise<ProtectionFormState> {
  const attempted = attemptedFromForm(input.formData);
  await ensureRuntime();
  const { actor } = await requireActor();
  const correlationId = actor.correlationId;
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
            scopePath: input.scopePath,
            actionType: input.actionType,
            correlationId,
            status: "SUCCESS",
            code: "SUCCESS",
            message: (outcome.application === "REPLAYED" ? "No change. This command was already applied." : "Protection command applied.").slice(0, 400),
            application: outcome.application,
            didDataChange: outcome.didDataChange,
            eventId: String(input.formData.get("eventId") ?? "") || undefined,
            organisationId: String(input.formData.get("organisationId") ?? "") || undefined,
          }),
        ),
    });
    redirect(
      resultHref(
        input.scopePath,
        correlationId,
        outcome.result && "id" in (outcome.result ?? {}) ? { subjectId: String((outcome.result as { id?: string }).id ?? "") } : undefined,
      ),
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const normalised = platformErrorFromUnknown(error);
    if (normalised.code === "VALIDATION_FAILED") {
      const field = normalised.field ?? "form";
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
            scopePath: input.scopePath,
            actionType: input.actionType,
            correlationId,
            status: "FAILURE",
            code: classified.code,
            message: classified.message,
            application: "NOT_APPLIED",
            didDataChange: false,
            eventId: String(input.formData.get("eventId") ?? "") || undefined,
            organisationId: String(input.formData.get("organisationId") ?? "") || undefined,
          }),
        ),
    });
    redirect(resultHref(input.scopePath, correlationId));
  }
}
