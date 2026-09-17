"use server";

import { redirect } from "next/navigation";
import {
  executeS06Evaluation,
  formDataToRecord,
  PlatformError,
  requireSeatingV2Writable,
  safeAttemptedValues,
  transportFailureFormState,
  type ProtectionFormState,
  type SeatingV2RuleContent,
} from "@maison-doclar/shared-platform";
import { writeActionResult } from "./action-flash";
import { buildActionResult, resultHref, sessionHashFromToken } from "./action-result";
import { writeTruthfulActionResult } from "./protection-form-lifecycle";
import { getRuntime } from "./runtime";
import { readStaffSessionCookie } from "./staff-session-cookie";
import { establishTrustedSeatingContext, runTrustedSeatingAction } from "./trusted-seating-action-context";

function asId(result: { value: { id: string } }) {
  return { id: result.value.id };
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function hardness(kind: string): SeatingV2RuleContent["hardness"] {
  if (kind === "WEIGHTED") return "SOFT";
  if (kind === "INFORMATION") return "INFORMATIONAL";
  return "HARD";
}

function requireV2Mutation() {
  requireSeatingV2Writable();
}

export async function freezeSeatingInputsAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.input.prepare",
    actionType: "seating.input.freeze",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().freezePackage(actor, envelope, {
          seed: field(formData, "seed") || undefined,
        }),
      );
    },
  });
}

export async function createSeatingConstraintAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.constraint.manage",
    actionType: "seating.constraint.create",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      const kind = field(formData, "kind") as "HARD" | "WEIGHTED" | "INFORMATION";
      const predicateType = field(formData, "predicateType");
      const guestIds = [field(formData, "guestIdA"), field(formData, "guestIdB")].filter(Boolean);
      return asId(
        await getRuntime().service.seatingV2Commands().createRule(actor, envelope, {
          kind: predicateType as SeatingV2RuleContent["kind"],
          hardness: hardness(kind),
          weight: kind === "WEIGHTED" ? Number(field(formData, "weight") || "1") : null,
          scope: "TABLE",
          specialistDomain: (field(formData, "reviewDomain") || "NONE") as SeatingV2RuleContent["specialistDomain"],
          subjects: guestIds.map((id) => ({ type: "EVENT_GUEST" as const, id })),
          targets: field(formData, "tableId") ? [{ type: "TABLE" as const, idOrCode: field(formData, "tableId") }] : [],
          source: { type: "MANUAL" },
        }),
      );
    },
  });
}

export async function createReservationBlockAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.reservation.manage",
    actionType: "seating.reservation.create",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().createReservation(actor, envelope, {
          eligibleMemberIds: field(formData, "eligibleGuestIds")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          targets: field(formData, "tableId") ? [{ type: "TABLE", idOrCode: field(formData, "tableId") }] : [],
          exact: field(formData, "exactCount") ? Number(field(formData, "exactCount")) : null,
          min: field(formData, "minCount") ? Number(field(formData, "minCount")) : null,
          max: field(formData, "maxCount") ? Number(field(formData, "maxCount")) : null,
        }),
      );
    },
  });
}

export async function activateReservationBlockAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.view",
    actionType: "seating.reservation.activate",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().activateReservation(actor, envelope, {
          editionId: field(formData, "blockId"),
        }),
      );
    },
  });
}

export async function withdrawReservationBlockAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.reservation.manage",
    actionType: "seating.reservation.withdraw",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().withdrawReservation(actor, envelope, {
          editionId: field(formData, "blockId"),
          reason: field(formData, "reason") || "Withdrawn from governing set",
        }),
      );
    },
  });
}

export async function supersedeReservationBlockAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.reservation.manage",
    actionType: "seating.reservation.supersede",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().supersedeReservation(actor, envelope, {
          editionId: field(formData, "blockId"),
          eligibleMemberIds: field(formData, "eligibleGuestIds")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          targets: field(formData, "tableId") ? [{ type: "TABLE", idOrCode: field(formData, "tableId") }] : [],
          exact: field(formData, "exactCount") ? Number(field(formData, "exactCount")) : null,
          min: field(formData, "minCount") ? Number(field(formData, "minCount")) : null,
          max: field(formData, "maxCount") ? Number(field(formData, "maxCount")) : null,
        }),
      );
    },
  });
}

export async function releaseReservationBlockAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.reservation.manage",
    actionType: "seating.reservation.release",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().releaseReservation(actor, envelope, {
          editionId: field(formData, "blockId"),
          decision: "RELEASED",
        }),
      );
    },
  });
}

export async function launchSeatingRunAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.run.execute",
    actionType: "seating.run.launch",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().launchRun(actor, envelope, {
          packageId: field(formData, "inputEditionId"),
        }),
      );
    },
  });
}

export async function cancelSeatingRunAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.run.execute",
    actionType: "seating.run.cancel",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().requestCpsatCancellation(actor, envelope, {
          runId: field(formData, "runId"),
        }),
      );
    },
  });
}

export async function stopSeatingRunKeepBestAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.run.execute",
    actionType: "seating.run.stop_keep_best",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().requestCpsatStop(actor, envelope, {
          runId: field(formData, "runId"),
          mode: "KEEP_BEST",
        }),
      );
    },
  });
}

export async function adoptSeatingRunAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.plan.edit",
    actionType: "seating.run.adopt",
    execute: async () => {
      throw new PlatformError(
        "CAPABILITY_NOT_ENABLED",
        "Legacy seating adopt is retired; use CP-SAT adopt",
        { publicMessage: "Legacy seating adoption is retired. Adopt a sealed CP-SAT candidate instead." },
      );
    },
  });
}

export async function applySeatingChangeAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.plan.edit",
    actionType: "seating.plan.edit",
    subjectFromForm: (data) => ({
      subjectId: field(data, "editionId") || undefined,
      attemptedVersion: field(data, "expectedVersion") ? Number(field(data, "expectedVersion")) : undefined,
    }),
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      const command = field(formData, "command");
      const planEditionId = field(formData, "editionId");
      if (command === "ASSIGN_UNSEATED") {
        return asId(
          await getRuntime().service.seatingV2Commands().assignUnseated(actor, envelope, {
            planEditionId,
            eventGuestId: field(formData, "guestId"),
            positionToken: field(formData, "targetPositionId"),
          }),
        );
      }
      return asId(
        await getRuntime().service.seatingV2Commands().applyManual(actor, envelope, {
          planEditionId,
          command:
            command === "SWAP"
              ? { type: "SWAP", leftGuestId: field(formData, "guestId"), rightGuestId: field(formData, "otherGuestId") }
              : command === "UNSEAT"
                ? { type: "UNSEAT", eventGuestId: field(formData, "guestId"), reasonCode: field(formData, "reasonCode") || "MANUAL_UNSEAT" }
                : command === "LOCK" || command === "UNLOCK"
                  ? { type: command, eventGuestId: field(formData, "guestId") }
                  : { type: "MOVE", eventGuestId: field(formData, "guestId"), positionToken: field(formData, "targetPositionId") },
        }),
      );
    },
  });
}

export async function submitSeatingPlanAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.plan.submit",
    actionType: "seating.plan.submit",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(await getRuntime().service.seatingV2Commands().submitPlan(actor, envelope, { editionId: field(formData, "editionId") }));
    },
  });
}

export async function decideSeatingReviewAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.view",
    actionType: "seating.plan.review",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().recordSpecialistReview(actor, envelope, {
          editionId: field(formData, "editionId"),
          editionHash: field(formData, "editionHash"),
          domain: field(formData, "domain") as "PROTOCOL" | "ACCESSIBILITY" | "SECURITY",
          decision: field(formData, "decision") as "APPROVED" | "REJECTED",
          reason: field(formData, "reason") || "Reviewed",
        }),
      );
    },
  });
}

export async function decideSeatingApprovalAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.plan.approve",
    actionType: "seating.plan.approve",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().approvePlan(actor, envelope, {
          editionId: field(formData, "editionId"),
          editionHash: field(formData, "editionHash"),
          decision: field(formData, "decision") as "APPROVED" | "REJECTED",
          reason: field(formData, "reason") || "Operational approval",
        }),
      );
    },
  });
}

export async function publishSeatingPlanAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.plan.publish",
    actionType: "seating.plan.publish",
    execute: async () => {
      throw new PlatformError(
        "CAPABILITY_NOT_ENABLED",
        "Legacy seating publish is retired; use CP-SAT adopt",
        {
          publicMessage:
            "Legacy seating publication is retired. Adopt a sealed CP-SAT candidate as the operational publication.",
        },
      );
    },
  });
}

export async function requestSeatingExportAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.export",
    actionType: "seating.export",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      const projection = field(formData, "projectionClass");
      return asId(
        await getRuntime().service.seatingV2Commands().requestExport(actor, envelope, {
          sourceType: field(formData, "publicationId") ? "PUBLICATION" : "EDITION",
          sourceId: field(formData, "publicationId") || field(formData, "editionId"),
          format: field(formData, "format") as "PDF" | "PNG" | "JSON",
          projectionClass:
            projection === "AUDITOR" ? "PERMISSION_SAFE" : projection === "CEO" ? "FULL" : "OPERATIONAL",
        }),
      );
    },
  });
}

export async function activateSeatingRuleAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.view",
    actionType: "seating.rule.activate",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(await getRuntime().service.seatingV2Commands().activateRule(actor, envelope, { editionId: field(formData, "editionId") }));
    },
  });
}

export async function withdrawSeatingRuleAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.constraint.manage",
    actionType: "seating.constraint.manage",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().withdrawRule(actor, envelope, {
          editionId: field(formData, "editionId"),
          reason: field(formData, "reason") || "Withdrawn",
        }),
      );
    },
  });
}

export async function recallSeatingPlanAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.view",
    actionType: "seating.plan.submit",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(await getRuntime().service.seatingV2Commands().recallPlan(actor, envelope, { editionId: field(formData, "editionId") }));
    },
  });
}

export async function proposeSeatingLayoutBindingAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.input.prepare",
    actionType: "seating.layout_binding.propose",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().proposeLayoutBinding(actor, envelope, {
          layoutPublicationId: field(formData, "layoutPublicationId"),
          reason: field(formData, "reason") || "Propose the nominated current layout publication for Seating Command.",
        }),
      );
    },
  });
}

/**
 * After a lost/503 transport response, look up the durable propose receipt by idempotency key.
 * Committed → truthful recovered SUCCESS redirect. Not committed → inline failure with preserved form.
 * Authority is established once via the canonical trusted seating context (same as propose).
 */
export async function recoverProposeSeatingLayoutBindingAction(
  boundEventId: string,
  _prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  const attempted = safeAttemptedValues(formDataToRecord(formData));
  const unconfirmed =
    "We could not confirm that this proposal was saved. Your entries are preserved. Check again or retry safely.";
  const recovered =
    "We temporarily lost the server response. Maison Doclar checked the saved state and confirmed that this proposal was created.";

  const failInline = () =>
    transportFailureFormState({
      attemptedValues: attempted.values,
      sensitiveCleared: attempted.sensitiveCleared,
      summary: unconfirmed,
    });

  try {
    requireV2Mutation();
    const established = await establishTrustedSeatingContext({
      boundEventId,
      formData,
      permission: "seating.input.prepare",
    });
    if (!established.ok) return failInline();
    const { actor, event, scope, envelope } = established.context;
    if (envelope.idempotencyKey.length < 12) return failInline();
    const receipt = await getRuntime()
      .service.seatingV2Commands()
      .lookupMutationReceipt(actor, envelope, "seatingV2.proposeLayoutBinding", "seating.input.prepare");
    if (!receipt || (receipt.application !== "APPLIED" && receipt.application !== "REPLAYED")) {
      return failInline();
    }
    await writeTruthfulActionResult({
      status: "SUCCESS",
      code: "SUCCESS",
      application: "REPLAYED",
      didDataChange: false,
      persist: async () =>
        writeActionResult(
          buildActionResult({
            sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
            actorPersonId: actor.personId,
            scopePath: scope.scopePath,
            actionType: "seating.layout_binding.propose",
            correlationId: actor.correlationId,
            status: "SUCCESS",
            code: "SUCCESS",
            message: recovered,
            application: "REPLAYED",
            didDataChange: false,
            eventId: event.id,
            organisationId: event.organisationId,
            subjectId: receipt.resultIdentity,
          }),
        ),
    });
    redirect(resultHref(scope.scopePath, actor.correlationId, { subjectId: receipt.resultIdentity }));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return failInline();
  }
}

export async function activateSeatingLayoutBindingAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.rule.activate",
    actionType: "seating.layout_binding.activate",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().activateLayoutBinding(actor, envelope, {
          bindingId: field(formData, "bindingId"),
          expectedVersion: Number(field(formData, "expectedVersion") || 0),
          layoutPublicationId: field(formData, "layoutPublicationId") || undefined,
          layoutContentHash: field(formData, "layoutContentHash") || undefined,
        }),
      );
    },
  });
}

export async function withdrawSeatingLayoutBindingAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.view",
    actionType: "seating.layout_binding.withdraw",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      return asId(
        await getRuntime().service.seatingV2Commands().withdrawLayoutBinding(actor, envelope, {
          bindingId: field(formData, "bindingId"),
          expectedVersion: Number(field(formData, "expectedVersion") || 0),
        }),
      );
    },
  });
}

export async function runS06EvaluationAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.evaluate",
    actionType: "seating.evaluate",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      void executeS06Evaluation;
      const result = await getRuntime().service.seatingV2Commands().runS06EvaluationV2(actor, envelope);
      return {
        id: result.value.id,
        status: String((result.value as { status?: string }).status ?? ""),
        failedCount: Number((result.value as { failedCount?: number }).failedCount ?? 0),
        passedCount: Number((result.value as { passedCount?: number }).passedCount ?? 0),
        caseCount: Number((result.value as { caseCount?: number }).caseCount ?? 0),
        readinessResult: String((result.value as { readinessResult?: string }).readinessResult ?? ""),
        safeFailureCodes: Array.isArray((result.value as { safeFailureCodes?: string[] }).safeFailureCodes)
          ? ((result.value as { safeFailureCodes?: string[] }).safeFailureCodes as string[])
          : [],
      };
    },
  });
}

export async function submitCpsatCandidateAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.plan.submit",
    actionType: "seating.cpsat.submit",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      const result = await getRuntime().service.seatingV2Commands().submitCpsatCandidateForApproval(actor, envelope, {
        runId: field(formData, "runId"),
        candidateId: field(formData, "candidateId"),
        assignmentHash: field(formData, "assignmentHash"),
      });
      return { id: result.value.proposalId };
    },
  });
}

export async function decideCpsatCandidateAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  const decision = field(formData, "decision") === "REJECTED" ? "REJECTED" : "APPROVED";
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.plan.approve",
    actionType: decision === "APPROVED" ? "seating.cpsat.approve" : "seating.cpsat.reject",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      const result = await getRuntime().service.seatingV2Commands().decideCpsatCandidateApproval(actor, envelope, {
        runId: field(formData, "runId"),
        candidateId: field(formData, "candidateId"),
        assignmentHash: field(formData, "assignmentHash"),
        proposalId: field(formData, "proposalId"),
        decision,
        reason: field(formData, "reason") || undefined,
      });
      return { id: result.value.proposalId };
    },
  });
}

export async function adoptCpsatCandidateAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.plan.publish",
    actionType: "seating.cpsat.adopt",
    execute: async ({ actor, envelope }) => {
      requireV2Mutation();
      const result = await getRuntime().service.seatingV2Commands().adoptApprovedCpsatCandidate(actor, envelope, {
        runId: field(formData, "runId"),
        candidateId: field(formData, "candidateId"),
        approvalId: field(formData, "approvalId"),
        assignmentHash: field(formData, "assignmentHash") || undefined,
      });
      return { id: result.value.adoptionId };
    },
  });
}
