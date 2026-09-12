"use server";

import { parseFormSchema, type ProtectionFormState } from "@maison-doclar/shared-platform";
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

export async function releaseReservationBlockAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: scopePath(formData),
    actionType: "seating.reservation.release",
    parse: parseEnvelope,
    execute: async () => {
      const { actor, envelope } = await sessionEnvelope(formData);
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
      return asId(await getRuntime().service.seatingCommands().requestSeatingExport(actor, envelope, {
        publicationId: field(formData, "publicationId") || undefined,
        editionId: field(formData, "editionId") || undefined,
        format: field(formData, "format") as "PDF" | "PNG" | "JSON",
        projectionClass: field(formData, "projectionClass") as "PLANNER" | "DIRECTOR" | "CEO" | "AUDITOR" | "DOWNSTREAM",
      }));
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
      return asId(await getRuntime().service.seatingCommands().runS06Evaluation(actor, envelope));
    },
  });
}
