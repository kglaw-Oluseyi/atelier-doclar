"use server";

import {
  executeS06Evaluation,
  parseFormSchema,
  seatingV2ReplacementEnabled,
  type ProtectionFormState,
  type SeatingV2RuleContent,
} from "@maison-doclar/shared-platform";
import { runProtectionFormAction } from "./protection-form-action";
import { getRuntime } from "./runtime";
import { requireActor } from "./with-session";

const UuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EnvelopeSchema = {
  safeParse(value: unknown) {
    const record = value && typeof value === "object" ? (value as Record<string, string | undefined>) : {};
    const fieldErrors: Record<string, string> = {};
    for (const key of ["organisationId", "eventId", "assignmentId"] as const) {
      if (!UuidPattern.test(record[key] ?? "")) fieldErrors[key] = "Choose a valid record.";
    }
    if ((record.idempotencyKey ?? "").length < 12) fieldErrors.idempotencyKey = "Reload before retrying.";
    if (Object.keys(fieldErrors).length) {
      return { success: false as const, error: { issues: Object.entries(fieldErrors).map(([path, message]) => ({ path: [path], message })) } };
    }
    return { success: true as const, data: record };
  },
};

function asId(result: { value: { id: string } }) {
  return { id: result.value.id };
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function scopePath(formData: FormData): string {
  return `/app/events/${field(formData, "eventId")}/seating`;
}

async function sessionEnvelope(formData: FormData) {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const resolved = runtime.service.resolveActor(actor.personId);
  const organisationId = field(formData, "organisationId");
  const eventId = field(formData, "eventId");
  const assignment =
    resolved.assignments.find(
      (item) => item.status === "ACTIVE" && item.organisationId === organisationId && item.eventId === eventId,
    ) ??
    resolved.assignments.find(
      (item) => item.status === "ACTIVE" && item.organisationId === organisationId && !item.eventId,
    );
  if (!assignment) {
    throw new Error("This assignment cannot perform this seating action.");
  }
  return {
    actor,
    envelope: {
      organisationId,
      eventId,
      actorAssignmentId: assignment.id,
      expectedVersion: field(formData, "expectedVersion") ? Number(field(formData, "expectedVersion")) : undefined,
      expectedContentHash: field(formData, "expectedContentHash") || undefined,
      idempotencyKey: field(formData, "idempotencyKey"),
    },
  };
}

function v2() {
  return seatingV2ReplacementEnabled();
}

function hardness(kind: string): SeatingV2RuleContent["hardness"] {
  if (kind === "WEIGHTED") return "SOFT";
  if (kind === "INFORMATION") return "INFORMATIONAL";
  return "HARD";
}

function parseEnvelope(formData: FormData) {
  return parseFormSchema(EnvelopeSchema, {
    organisationId: field(formData, "organisationId"),
    eventId: field(formData, "eventId"),
    assignmentId: field(formData, "assignmentId"),
    expectedVersion: field(formData, "expectedVersion") || undefined,
    expectedContentHash: field(formData, "expectedContentHash") || undefined,
    idempotencyKey: field(formData, "idempotencyKey"),
  });
}

export async function freezeSeatingInputsAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.input.freeze",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) return asId(await getRuntime().service.seatingV2Commands().freezePackage(actor, envelope, { seed: field(formData, "seed") || undefined }));
      return asId(await getRuntime().service.seatingCommands().freezeSeatingInputs(actor, envelope));
    },
  });
}

export async function createSeatingConstraintAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.constraint.create",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      const kind = field(formData, "kind") as "HARD" | "WEIGHTED" | "INFORMATION";
      const predicateType = field(formData, "predicateType");
      const guestIds = [field(formData, "guestIdA"), field(formData, "guestIdB")].filter(Boolean);
      if (v2()) {
        return asId(await getRuntime().service.seatingV2Commands().createRule(actor, envelope, {
          kind: predicateType as SeatingV2RuleContent["kind"],
          hardness: hardness(kind),
          weight: kind === "WEIGHTED" ? Number(field(formData, "weight") || "1") : null,
          scope: "TABLE",
          specialistDomain: (field(formData, "reviewDomain") || "NONE") as SeatingV2RuleContent["specialistDomain"],
          subjects: guestIds.map((id) => ({ type: "EVENT_GUEST" as const, id })),
          targets: field(formData, "tableId") ? [{ type: "TABLE" as const, idOrCode: field(formData, "tableId") }] : [],
          source: { type: "MANUAL" },
        }));
      }
      return asId(await getRuntime().service.seatingCommands().createSeatingConstraint(actor, envelope, {
        kind,
        predicateType,
        payload: {
          predicateType,
          guestIds,
          tableRefs: field(formData, "tableId") ? [field(formData, "tableId")] : [],
          zoneCodes: field(formData, "zoneCode") ? [field(formData, "zoneCode")] : [],
          capabilityCodes: field(formData, "capabilityCode") ? [field(formData, "capabilityCode")] : [],
        },
        weight: kind === "WEIGHTED" ? Number(field(formData, "weight") || "1") : undefined,
        authority: kind === "HARD" ? "HARD_AUTHORISED" : kind === "WEIGHTED" ? "WEIGHTED" : "INFORMATION",
        evidenceRefs: field(formData, "evidence") ? [field(formData, "evidence")] : [],
        disclosureClass: "OPERATIONAL",
        reviewDomain: (field(formData, "reviewDomain") || undefined) as "PROTOCOL" | "ACCESSIBILITY" | "SECURITY" | undefined,
        status: field(formData, "reviewDomain") ? "DRAFT" : "APPROVED",
      }));
    },
  });
}

export async function createReservationBlockAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.reservation.create",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) {
        return asId(await getRuntime().service.seatingV2Commands().createReservation(actor, envelope, {
          eligibleMemberIds: field(formData, "eligibleGuestIds").split(",").map((item) => item.trim()).filter(Boolean),
          targets: field(formData, "tableId") ? [{ type: "TABLE", idOrCode: field(formData, "tableId") }] : [],
          exact: field(formData, "exactCount") ? Number(field(formData, "exactCount")) : null,
          min: field(formData, "minCount") ? Number(field(formData, "minCount")) : null,
          max: field(formData, "maxCount") ? Number(field(formData, "maxCount")) : null,
        }));
      }
      return asId(await getRuntime().service.seatingCommands().createReservationBlock(actor, envelope, {
        eligibleSetCode: field(formData, "eligibleSetCode"),
        eligibleGuestIds: field(formData, "eligibleGuestIds")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        tableRefs: field(formData, "tableId") ? [field(formData, "tableId")] : [],
        zoneRefs: field(formData, "zoneCode") ? [field(formData, "zoneCode")] : [],
        minCount: field(formData, "minCount") ? Number(field(formData, "minCount")) : undefined,
        maxCount: field(formData, "maxCount") ? Number(field(formData, "maxCount")) : undefined,
        exactCount: field(formData, "exactCount") ? Number(field(formData, "exactCount")) : undefined,
        priority: Number(field(formData, "priority") || "1"),
      }));
    },
  });
}

export async function activateReservationBlockAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.reservation.activate",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      return asId(await getRuntime().service.seatingV2Commands().activateReservation(actor, envelope, {
        editionId: field(formData, "blockId"),
      }));
    },
  });
}

export async function withdrawReservationBlockAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.reservation.withdraw",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      return asId(await getRuntime().service.seatingV2Commands().withdrawReservation(actor, envelope, {
        editionId: field(formData, "blockId"),
        reason: field(formData, "reason") || "Withdrawn from governing set",
      }));
    },
  });
}

export async function supersedeReservationBlockAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.reservation.supersede",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      return asId(await getRuntime().service.seatingV2Commands().supersedeReservation(actor, envelope, {
        editionId: field(formData, "blockId"),
        eligibleMemberIds: field(formData, "eligibleGuestIds").split(",").map((item) => item.trim()).filter(Boolean),
        targets: field(formData, "tableId") ? [{ type: "TABLE", idOrCode: field(formData, "tableId") }] : [],
        exact: field(formData, "exactCount") ? Number(field(formData, "exactCount")) : null,
        min: field(formData, "minCount") ? Number(field(formData, "minCount")) : null,
        max: field(formData, "maxCount") ? Number(field(formData, "maxCount")) : null,
      }));
    },
  });
}

export async function releaseReservationBlockAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.reservation.release",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) {
        return asId(await getRuntime().service.seatingV2Commands().releaseReservation(actor, envelope, {
          editionId: field(formData, "blockId"),
          decision: "RELEASED",
        }));
      }
      return asId(await getRuntime().service.seatingCommands().releaseReservationBlock(actor, envelope, {
        blockId: field(formData, "blockId"),
        expectedVersion: Number(field(formData, "expectedVersion") || "0"),
      }));
    },
  });
}

export async function launchSeatingRunAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.run.launch",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) {
        return asId(await getRuntime().service.seatingV2Commands().launchRun(actor, envelope, {
          packageId: field(formData, "inputEditionId"),
        }));
      }
      return asId(await getRuntime().service.seatingCommands().launchSeatingRun(actor, envelope, {
        inputEditionId: field(formData, "inputEditionId"),
        seed: field(formData, "seed") || undefined,
      }));
    },
  });
}

export async function cancelSeatingRunAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.run.cancel",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      return asId(await getRuntime().service.seatingCommands().cancelSeatingRun(actor, envelope, {
        runId: field(formData, "runId"),
        expectedVersion: Number(field(formData, "expectedVersion") || "0"),
      }));
    },
  });
}

export async function adoptSeatingRunAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.run.adopt",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) return asId(await getRuntime().service.seatingV2Commands().adoptRun(actor, envelope, { runId: field(formData, "runId") }));
      return asId(await getRuntime().service.seatingCommands().adoptSeatingRun(actor, envelope, { runId: field(formData, "runId") }));
    },
  });
}

export async function applySeatingChangeAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.plan.edit",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) {
        const command = field(formData, "command");
        const planEditionId = field(formData, "editionId");
        if (command === "ASSIGN_UNSEATED") {
          return asId(await getRuntime().service.seatingV2Commands().assignUnseated(actor, envelope, {
            planEditionId,
            eventGuestId: field(formData, "guestId"),
            positionToken: field(formData, "targetPositionId"),
          }));
        }
        return asId(await getRuntime().service.seatingV2Commands().applyManual(actor, envelope, {
          planEditionId,
          command:
            command === "SWAP"
              ? { type: "SWAP", leftGuestId: field(formData, "guestId"), rightGuestId: field(formData, "otherGuestId") }
              : command === "UNSEAT"
                ? { type: "UNSEAT", eventGuestId: field(formData, "guestId"), reasonCode: field(formData, "reasonCode") || "MANUAL_UNSEAT" }
                : command === "LOCK" || command === "UNLOCK"
                  ? { type: command, eventGuestId: field(formData, "guestId") }
                  : { type: "MOVE", eventGuestId: field(formData, "guestId"), positionToken: field(formData, "targetPositionId") },
        }));
      }
      return asId(await getRuntime().service.seatingCommands().applySeatingChange(actor, envelope, {
        editionId: field(formData, "editionId"),
        command: field(formData, "command") as "MOVE" | "UNSEAT" | "LOCK" | "UNLOCK" | "SWAP",
        guestId: field(formData, "guestId"),
        targetPositionId: field(formData, "targetPositionId") || undefined,
        otherGuestId: field(formData, "otherGuestId") || undefined,
        reasonCode: field(formData, "reasonCode") || "MANUAL",
        reasonText: field(formData, "reasonText") || undefined,
      }));
    },
  });
}

export async function submitSeatingPlanAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.plan.submit",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) return asId(await getRuntime().service.seatingV2Commands().submitPlan(actor, envelope, { editionId: field(formData, "editionId") }));
      return asId(await getRuntime().service.seatingCommands().submitSeatingPlan(actor, envelope, { editionId: field(formData, "editionId") }));
    },
  });
}

export async function decideSeatingReviewAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.plan.review",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) {
        return asId(await getRuntime().service.seatingV2Commands().recordSpecialistReview(actor, envelope, {
          editionId: field(formData, "editionId"),
          editionHash: field(formData, "editionHash"),
          domain: field(formData, "domain") as "PROTOCOL" | "ACCESSIBILITY" | "SECURITY",
          decision: field(formData, "decision") as "APPROVED" | "REJECTED",
          reason: field(formData, "reason") || "Reviewed",
        }));
      }
      return asId(await getRuntime().service.seatingCommands().decideSeatingReview(actor, envelope, {
        editionId: field(formData, "editionId"),
        editionHash: field(formData, "editionHash"),
        domain: field(formData, "domain") as "PROTOCOL" | "ACCESSIBILITY" | "SECURITY",
        decision: field(formData, "decision") as "APPROVED" | "REJECTED",
        reason: field(formData, "reason") || "Reviewed",
      }));
    },
  });
}

export async function decideSeatingApprovalAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.plan.approve",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) {
        return asId(await getRuntime().service.seatingV2Commands().approvePlan(actor, envelope, {
          editionId: field(formData, "editionId"),
          editionHash: field(formData, "editionHash"),
          decision: field(formData, "decision") as "APPROVED" | "REJECTED",
          reason: field(formData, "reason") || "Operational approval",
        }));
      }
      return asId(await getRuntime().service.seatingCommands().decideSeatingApproval(actor, envelope, {
        editionId: field(formData, "editionId"),
        editionHash: field(formData, "editionHash"),
        decision: field(formData, "decision") as "APPROVED" | "REJECTED",
      }));
    },
  });
}

export async function publishSeatingPlanAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.plan.publish",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) {
        return asId(await getRuntime().service.seatingV2Commands().publishPlan(actor, envelope, {
          editionId: field(formData, "editionId"),
          editionHash: field(formData, "editionHash"),
        }));
      }
      return asId(await getRuntime().service.seatingCommands().publishSeatingPlan(actor, envelope, {
        editionId: field(formData, "editionId"),
        editionHash: field(formData, "editionHash"),
      }));
    },
  });
}

export async function requestSeatingExportAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.export",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      if (v2()) {
        const projection = field(formData, "projectionClass");
        return asId(await getRuntime().service.seatingV2Commands().requestExport(actor, envelope, {
          sourceType: field(formData, "publicationId") ? "PUBLICATION" : "EDITION",
          sourceId: field(formData, "publicationId") || field(formData, "editionId"),
          format: field(formData, "format") as "PDF" | "PNG" | "JSON",
          projectionClass:
            projection === "AUDITOR" ? "PERMISSION_SAFE" : projection === "CEO" ? "FULL" : "OPERATIONAL",
        }));
      }
      return asId(await getRuntime().service.seatingCommands().requestSeatingExport(actor, envelope, {
        publicationId: field(formData, "publicationId") || undefined,
        editionId: field(formData, "editionId") || undefined,
        format: field(formData, "format") as "PDF" | "PNG" | "JSON",
        projectionClass: field(formData, "projectionClass") as "PLANNER" | "DIRECTOR" | "CEO" | "AUDITOR" | "DOWNSTREAM",
      }));
    },
  });
}

export async function activateSeatingRuleAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.rule.activate",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      return asId(await getRuntime().service.seatingV2Commands().activateRule(actor, envelope, { editionId: field(formData, "editionId") }));
    },
  });
}

export async function withdrawSeatingRuleAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.constraint.manage",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      return asId(await getRuntime().service.seatingV2Commands().withdrawRule(actor, envelope, {
        editionId: field(formData, "editionId"),
        reason: field(formData, "reason") || "Withdrawn",
      }));
    },
  });
}

export async function recallSeatingPlanAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.plan.submit",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      return asId(await getRuntime().service.seatingV2Commands().recallPlan(actor, envelope, { editionId: field(formData, "editionId") }));
    },
  });
}

export async function runS06EvaluationAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.evaluate",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
      void executeS06Evaluation;
      return asId(await getRuntime().service.seatingV2Commands().runS06EvaluationV2(actor, envelope));
    },
  });
}
