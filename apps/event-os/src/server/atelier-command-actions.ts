"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeActionResult } from "./action-flash";
import { buildActionResult, resultHref, sessionHashFromToken } from "./action-result";
import { classifyActionError } from "./operational-state";
import { readStaffSessionCookie } from "./staff-session-cookie";
import { requireActor } from "./with-session";
import { getRuntime } from "./runtime";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isNextRedirect(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

async function finish(input: {
  path: string;
  actorPersonId: string;
  correlationId: string;
  actionType: string;
  eventId: string;
  organisationId: string;
  status: "SUCCESS" | "FAILURE";
  code: "SUCCESS" | ReturnType<typeof classifyActionError>["code"];
  message: string;
  didDataChange?: boolean;
  createdRecordIds?: string[];
}): Promise<never> {
  await writeActionResult(
    buildActionResult({
      sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
      actorPersonId: input.actorPersonId,
      scopePath: input.path,
      actionType: input.actionType,
      correlationId: input.correlationId,
      status: input.status,
      code: input.code,
      message: input.message,
      eventId: input.eventId,
      organisationId: input.organisationId,
      didDataChange: input.didDataChange,
      createdRecordIds: input.createdRecordIds,
    }),
  );
  revalidatePath(input.path);
  redirect(resultHref(input.path, input.correlationId));
}

export async function submitAtelierInstructionAction(formData: FormData): Promise<void> {
  const eventId = formString(formData, "eventId");
  const organisationId = formString(formData, "organisationId");
  const sessionId = formString(formData, "sessionId");
  const rawText = formString(formData, "rawText");
  const dryRun = formString(formData, "dryRun") === "1";
  const path = `/app/events/${eventId}/atelier-command`;
  const { actor, person } = await requireActor();
  const correlationId = actor.correlationId || randomUUID();
  try {
    const result = getRuntime().service.submitAtelierCommandInstruction(actor, organisationId, eventId, {
      sessionId,
      rawText,
      dryRun,
    });
    return finish({
      path,
      actorPersonId: person.id,
      correlationId: result.receipt?.correlationId ?? correlationId,
      actionType: "atelierCommand.instruct",
      eventId,
      organisationId,
      status: result.instruction.status === "REJECTED" ? "FAILURE" : "SUCCESS",
      code: result.instruction.status === "REJECTED" ? "FORBIDDEN" : "SUCCESS",
      message:
        result.instruction.status === "NEEDS_CLARIFICATION"
          ? "Clarification is required before this instruction can execute."
          : result.instruction.status === "REJECTED"
            ? (result.receipt?.summary ?? "Instruction refused by governance.")
            : "Instruction interpreted. Review the plan before execution.",
      didDataChange: result.instruction.status !== "REJECTED",
      createdRecordIds: [result.instruction.id, ...(result.plan ? [result.plan.id] : [])],
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const classified = classifyActionError(error);
    return finish({
      path,
      actorPersonId: person.id,
      correlationId,
      actionType: "atelierCommand.instruct",
      eventId,
      organisationId,
      status: "FAILURE",
      code: classified.code,
      message: classified.message,
      didDataChange: false,
    });
  }
}

export async function invokeAtelierTaskAction(formData: FormData): Promise<void> {
  const eventId = formString(formData, "eventId");
  const organisationId = formString(formData, "organisationId");
  const sessionId = formString(formData, "sessionId");
  const taskId = formString(formData, "taskId");
  const notes = formString(formData, "notes");
  const dryRun = formString(formData, "dryRun") === "1";
  const path = `/app/events/${eventId}/atelier-command`;
  const { actor, person } = await requireActor();
  const correlationId = actor.correlationId || randomUUID();
  try {
    getRuntime().service.invokeAtelierCommandTask(actor, organisationId, eventId, {
      sessionId,
      taskId,
      operatorEdits: notes ? { notes } : {},
      dryRun,
    });
    return finish({
      path,
      actorPersonId: person.id,
      correlationId,
      actionType: "atelierCommand.task",
      eventId,
      organisationId,
      status: "SUCCESS",
      code: "SUCCESS",
      message: "Task Bank item compiled into an event-scoped plan.",
      didDataChange: true,
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const classified = classifyActionError(error);
    return finish({
      path,
      actorPersonId: person.id,
      correlationId,
      actionType: "atelierCommand.task",
      eventId,
      organisationId,
      status: "FAILURE",
      code: classified.code,
      message: classified.message,
      didDataChange: false,
    });
  }
}

export async function confirmAtelierPlanAction(formData: FormData): Promise<void> {
  const eventId = formString(formData, "eventId");
  const organisationId = formString(formData, "organisationId");
  const planId = formString(formData, "planId");
  const path = `/app/events/${eventId}/atelier-command`;
  const { actor, person } = await requireActor();
  const correlationId = actor.correlationId || randomUUID();
  try {
    getRuntime().service.confirmAtelierCommandPlan(actor, organisationId, eventId, planId);
    return finish({
      path,
      actorPersonId: person.id,
      correlationId,
      actionType: "atelierCommand.confirm",
      eventId,
      organisationId,
      status: "SUCCESS",
      code: "SUCCESS",
      message: "Plan confirmed. Ready for execution.",
      didDataChange: true,
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const classified = classifyActionError(error);
    return finish({
      path,
      actorPersonId: person.id,
      correlationId,
      actionType: "atelierCommand.confirm",
      eventId,
      organisationId,
      status: "FAILURE",
      code: classified.code,
      message: classified.message,
      didDataChange: false,
    });
  }
}

export async function approveAtelierPlanAction(formData: FormData): Promise<void> {
  const eventId = formString(formData, "eventId");
  const organisationId = formString(formData, "organisationId");
  const planId = formString(formData, "planId");
  const path = `/app/events/${eventId}/atelier-command`;
  const { actor, person } = await requireActor();
  const correlationId = actor.correlationId || randomUUID();
  try {
    getRuntime().service.approveAtelierCommandPlan(actor, organisationId, eventId, planId);
    return finish({
      path,
      actorPersonId: person.id,
      correlationId,
      actionType: "atelierCommand.approve",
      eventId,
      organisationId,
      status: "SUCCESS",
      code: "SUCCESS",
      message: "Independent approval recorded.",
      didDataChange: true,
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const classified = classifyActionError(error);
    return finish({
      path,
      actorPersonId: person.id,
      correlationId,
      actionType: "atelierCommand.approve",
      eventId,
      organisationId,
      status: "FAILURE",
      code: classified.code,
      message: classified.message,
      didDataChange: false,
    });
  }
}

export async function executeAtelierPlanAction(formData: FormData): Promise<void> {
  const eventId = formString(formData, "eventId");
  const organisationId = formString(formData, "organisationId");
  const planId = formString(formData, "planId");
  const path = `/app/events/${eventId}/atelier-command`;
  const { actor, person } = await requireActor();
  const correlationId = actor.correlationId || randomUUID();
  try {
    const result = getRuntime().service.executeAtelierCommandPlan(actor, organisationId, eventId, planId);
    return finish({
      path,
      actorPersonId: person.id,
      correlationId: result.receipt.correlationId,
      actionType: "atelierCommand.execute",
      eventId,
      organisationId,
      status: "SUCCESS",
      code: "SUCCESS",
      message: result.receipt.summary,
      didDataChange: result.receipt.changedRecordIds.length > 0,
      createdRecordIds: result.receipt.changedRecordIds,
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const classified = classifyActionError(error);
    return finish({
      path,
      actorPersonId: person.id,
      correlationId,
      actionType: "atelierCommand.execute",
      eventId,
      organisationId,
      status: "FAILURE",
      code: classified.code,
      message: classified.message,
      didDataChange: false,
    });
  }
}
