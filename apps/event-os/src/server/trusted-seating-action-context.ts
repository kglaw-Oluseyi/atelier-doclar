import { redirect } from "next/navigation";
import {
  canSeeEvent,
  parseFormSchema,
  PlatformError,
  resolveTrustedSeatingAssignment,
  seatingAssignmentAllowsPermission,
  type ActorContext,
  type EventRecord,
  type PermissionKey,
  type ProtectionFormState,
  type ProtectionFieldErrors,
} from "@maison-doclar/shared-platform";
import { writeActionResult } from "./action-flash";
import { buildActionResult, resultHref, sessionHashFromToken } from "./action-result";
import { classifyActionError } from "./operational-state";
import { writeTruthfulActionResult } from "./protection-form-lifecycle";
import { runProtectionFormAction } from "./protection-form-action";
import { getRuntime } from "./runtime";
import { readStaffSessionCookie } from "./staff-session-cookie";
import { requireActor } from "./with-session";

export type TrustedSeatingEventScope = Readonly<{
  organisationId: string;
  clientId: string;
  eventId: string;
  assignmentId: string;
  roleKey: string;
  scopePath: `/app/events/${string}/seating`;
}>;

export type TrustedSeatingActionContext = Readonly<{
  actor: ActorContext;
  event: EventRecord;
  scope: TrustedSeatingEventScope;
  envelope: {
    organisationId: string;
    eventId: string;
    actorAssignmentId: string;
    idempotencyKey: string;
    expectedVersion?: number;
    expectedContentHash?: string;
  };
  correlationId: string;
}>;

const IdempotencySchema = {
  safeParse(value: unknown) {
    const record = value && typeof value === "object" ? (value as Record<string, string | undefined>) : {};
    if ((record.idempotencyKey ?? "").length < 12) {
      return {
        success: false as const,
        error: { issues: [{ path: ["idempotencyKey"], message: "Reload before retrying." }] },
      };
    }
    return { success: true as const, data: record };
  },
};

function submitted(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function denied(): never {
  throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
}

function parseIdempotency(formData: FormData) {
  return parseFormSchema(IdempotencySchema, { idempotencyKey: submitted(formData, "idempotencyKey") });
}

function assertScopeTripwire(formData: FormData, scope: TrustedSeatingEventScope): void {
  const organisationId = submitted(formData, "organisationId");
  const eventId = submitted(formData, "eventId");
  const assignmentId = submitted(formData, "assignmentId");
  if (organisationId && organisationId !== scope.organisationId) denied();
  if (eventId && eventId !== scope.eventId) denied();
  if (assignmentId && assignmentId !== scope.assignmentId) denied();
}

function concurrencyFromForm(formData: FormData): { expectedVersion?: number; expectedContentHash?: string } {
  const versionRaw = submitted(formData, "expectedVersion");
  const hash = submitted(formData, "expectedContentHash");
  const expectedVersion = versionRaw ? Number(versionRaw) : undefined;
  return {
    ...(expectedVersion !== undefined && Number.isFinite(expectedVersion) ? { expectedVersion } : {}),
    ...(hash ? { expectedContentHash: hash } : {}),
  };
}

async function writeMissingEventResult(input: {
  actor: ActorContext;
  actionType: string;
}): Promise<never> {
  const classified = classifyActionError(new PlatformError("NOT_FOUND", "event was not found"));
  await writeTruthfulActionResult({
    status: "FAILURE",
    code: classified.code,
    application: "NOT_APPLIED",
    didDataChange: false,
    persist: async () =>
      writeActionResult(
        buildActionResult({
          sessionHash: sessionHashFromToken((await readStaffSessionCookie()) ?? ""),
          actorPersonId: input.actor.personId,
          scopePath: "/app/events",
          actionType: input.actionType,
          correlationId: input.actor.correlationId,
          status: "FAILURE",
          code: classified.code,
          message: classified.message,
          application: "NOT_APPLIED",
          didDataChange: false,
        }),
      ),
  });
  redirect(resultHref("/app/events", input.actor.correlationId));
}

export async function runTrustedSeatingAction(input: {
  boundEventId: string;
  prev: ProtectionFormState;
  formData: FormData;
  permission: PermissionKey;
  actionType: string;
  parse?: (formData: FormData) => { success: true; data?: unknown } | { success: false; fieldErrors: ProtectionFieldErrors };
  execute: (context: TrustedSeatingActionContext, formData: FormData) => Promise<{ id?: string } | void>;
  subjectFromForm?: (formData: FormData) => { subjectId?: string; attemptedVersion?: number } | undefined;
}): Promise<ProtectionFormState> {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const event = runtime.store.loadEventById(input.boundEventId);
  if (!event) {
    return writeMissingEventResult({ actor, actionType: input.actionType });
  }
  const people = runtime.service.resolveActor(actor.personId);
  const now = actor.now ?? new Date().toISOString();
  if (!canSeeEvent(people, event, now)) {
    return writeMissingEventResult({ actor, actionType: input.actionType });
  }
  const scopePath = `/app/events/${event.id}/seating` as const;
  const trustedScope = {
    eventId: event.id,
    organisationId: event.organisationId,
    scopePath,
  };
  let context: TrustedSeatingActionContext | undefined;
  try {
    const assignment = resolveTrustedSeatingAssignment(people, event, now);
    if (!seatingAssignmentAllowsPermission(people, assignment, input.permission)) denied();
    const role = people.roles.find((item) => item.id === assignment.roleId);
    const scope: TrustedSeatingEventScope = {
      organisationId: event.organisationId,
      clientId: event.clientId,
      eventId: event.id,
      assignmentId: assignment.id,
      roleKey: role?.key ?? "",
      scopePath,
    };
    assertScopeTripwire(input.formData, scope);
    const concurrency = concurrencyFromForm(input.formData);
    context = {
      actor,
      event,
      scope,
      correlationId: actor.correlationId,
      envelope: {
        organisationId: scope.organisationId,
        eventId: scope.eventId,
        actorAssignmentId: scope.assignmentId,
        idempotencyKey: submitted(input.formData, "idempotencyKey"),
        ...concurrency,
      },
    };
  } catch (error) {
    return runProtectionFormAction({
      prev: input.prev,
      formData: input.formData,
      scopePath,
      actionType: input.actionType,
      actor,
      trustedScope,
      parse: () => ({ success: true as const }),
      execute: async () => {
        throw error;
      },
    });
  }
  return runProtectionFormAction({
    prev: input.prev,
    formData: input.formData,
    scopePath,
    actionType: input.actionType,
    actor,
    trustedScope,
    parse: input.parse ?? parseIdempotency,
    subjectFromForm: input.subjectFromForm,
    execute: async (authenticatedActor, formData) =>
      input.execute({ ...context!, actor: authenticatedActor, correlationId: authenticatedActor.correlationId }, formData),
  });
}
