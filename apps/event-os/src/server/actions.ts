"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AppError,
  archiveClient,
  createClient,
  createDepartment,
  createEvent,
  createProgramme,
  createWorkstream,
  decideApproval,
  grantAssignment,
  inviteUser,
  loadConfig,
  operateWorkstream,
  publicError,
  requestAuditExport,
  restoreClient,
  setAssignmentStatus,
  setDepartmentStatus,
  setUserStatus,
  settleAuditExport,
  signInFixture,
  signOut,
  submitApproval,
  transitionEvent,
  updateClient,
  updateEvent,
  updateMefSlot,
  updateOrganisation,
  type RoleKey,
} from "@maison-doclar/foundation";
import { correlationId, readSession, requireActor } from "./session";

function fail(path: string, error: unknown): never {
  if (error instanceof Error && "digest" in error) throw error;
  const message = error instanceof AppError ? error.message : publicError(error).message;
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData) {
  const config = loadConfig();
  try {
    const result = await signInFixture({
      userId: String(formData.get("userId") ?? ""),
      secret: config.sessionSecret,
      allowFixtures: config.allowFixtures,
      correlationId: correlationId(),
    });
    cookies().set("eos_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.nodeEnv === "production",
      path: "/",
    });
  } catch (error) {
    fail("/sign-in", error);
  }
  redirect("/app");
}

export async function signOutAction() {
  const session = await readSession();
  if (session) await signOut(session.sessionId, session.actor, correlationId());
  cookies().delete("eos_session");
  redirect("/sign-in");
}

export async function createClientAction(formData: FormData) {
  const session = await requireActor();
  let id = "";
  try {
    const created = await createClient(
      {
        actor: session.actor,
        correlationId: correlationId(),
        idempotencyKey: String(formData.get("idempotencyKey")),
      },
      {
        code: String(formData.get("code") ?? "").toUpperCase(),
        displayName: String(formData.get("displayName") ?? ""),
        legalName: String(formData.get("legalName") ?? ""),
        status: String(formData.get("status") ?? "ACTIVE"),
      },
    );
    id = created.id;
  } catch (error) {
    fail("/app/clients/new", error);
  }
  redirect(`/app/clients/${id}?notice=Client created`);
}

export async function updateClientAction(formData: FormData) {
  const session = await requireActor();
  const id = String(formData.get("id"));
  try {
    await updateClient(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        id,
        version: Number(formData.get("version")),
        displayName: String(formData.get("displayName") ?? ""),
        legalName: String(formData.get("legalName") ?? ""),
        status: String(formData.get("status") ?? "ACTIVE"),
      },
    );
  } catch (error) {
    fail(`/app/clients/${id}/edit`, error);
  }
  redirect(`/app/clients/${id}?notice=Client updated`);
}

export async function archiveClientAction(formData: FormData) {
  const session = await requireActor();
  const id = String(formData.get("id"));
  try {
    await archiveClient(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        id,
        version: Number(formData.get("version")),
        reason: String(formData.get("reason") ?? ""),
      },
    );
  } catch (error) {
    fail(`/app/clients/${id}`, error);
  }
  redirect(`/app/clients/${id}?notice=Client archived`);
}

export async function restoreClientAction(formData: FormData) {
  const session = await requireActor();
  const id = String(formData.get("id"));
  try {
    await restoreClient(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        id,
        version: Number(formData.get("version")),
        reason: String(formData.get("reason") ?? ""),
      },
    );
  } catch (error) {
    fail(`/app/clients/${id}`, error);
  }
  redirect(`/app/clients/${id}?notice=Client restored`);
}

export async function createProgrammeAction(formData: FormData) {
  const session = await requireActor();
  const clientId = String(formData.get("clientId"));
  try {
    await createProgramme(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      { clientId, name: String(formData.get("name") ?? "") },
    );
  } catch (error) {
    fail(`/app/clients/${clientId}`, error);
  }
  redirect(`/app/clients/${clientId}?notice=Programme created`);
}

export async function createEventAction(formData: FormData) {
  const session = await requireActor();
  let id = "";
  try {
    const created = await createEvent(
      {
        actor: session.actor,
        correlationId: correlationId(),
        idempotencyKey: String(formData.get("idempotencyKey")),
      },
      {
        clientId: String(formData.get("clientId")),
        programmeId: String(formData.get("programmeId") ?? "") || null,
        code: String(formData.get("code") ?? "").toUpperCase(),
        name: String(formData.get("name") ?? ""),
        startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
        endsAt: new Date(String(formData.get("endsAt"))).toISOString(),
        timezone: String(formData.get("timezone") ?? "Africa/Lagos"),
        venueSummary: String(formData.get("venueSummary") ?? ""),
        status: formData.get("draft") ? "DRAFT" : "ACTIVE",
      },
    );
    id = created.id;
  } catch (error) {
    fail("/app/events/new", error);
  }
  redirect(`/app/events/${id}?notice=Event created`);
}

export async function updateEventAction(formData: FormData) {
  const session = await requireActor();
  const id = String(formData.get("id"));
  try {
    await updateEvent(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        id,
        version: Number(formData.get("version")),
        name: String(formData.get("name") ?? ""),
        startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
        endsAt: new Date(String(formData.get("endsAt"))).toISOString(),
        timezone: String(formData.get("timezone") ?? "Africa/Lagos"),
        venueSummary: String(formData.get("venueSummary") ?? ""),
      },
    );
  } catch (error) {
    fail(`/app/events/${id}/settings`, error);
  }
  redirect(`/app/events/${id}?notice=Event facts updated`);
}

export async function transitionEventAction(formData: FormData) {
  const session = await requireActor();
  const id = String(formData.get("id"));
  try {
    await transitionEvent(
      {
        actor: session.actor,
        correlationId: correlationId(),
        idempotencyKey: String(formData.get("idempotencyKey")),
      },
      {
        id,
        version: Number(formData.get("version")),
        to: String(formData.get("to")),
        reason: String(formData.get("reason") ?? ""),
      },
    );
  } catch (error) {
    fail(`/app/events/${id}/settings`, error);
  }
  redirect(`/app/events/${id}/settings?notice=Phase updated`);
}

export async function updateMefAction(formData: FormData) {
  const session = await requireActor();
  const eventId = String(formData.get("eventId"));
  try {
    await updateMefSlot(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        eventId,
        slotKey: String(formData.get("slotKey")),
        version: Number(formData.get("version")),
        status: String(formData.get("status")),
        note: String(formData.get("note") ?? ""),
      },
    );
  } catch (error) {
    fail(`/app/events/${eventId}/mef`, error);
  }
  redirect(`/app/events/${eventId}/mef?notice=Composition slot updated`);
}

export async function inviteAction(formData: FormData) {
  const session = await requireActor();
  try {
    await inviteUser(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        email: String(formData.get("email") ?? ""),
        displayName: String(formData.get("displayName") ?? ""),
      },
    );
  } catch (error) {
    fail("/app/admin/access", error);
  }
  redirect("/app/admin/access?notice=Invitation recorded");
}

export async function userStatusAction(formData: FormData) {
  const session = await requireActor();
  try {
    await setUserStatus(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        userId: String(formData.get("userId")),
        status: String(formData.get("status")) as "ACTIVE" | "SUSPENDED" | "DEACTIVATED",
        reason: String(formData.get("reason") ?? ""),
      },
    );
  } catch (error) {
    fail("/app/admin/access", error);
  }
  redirect("/app/admin/access?notice=Staff status updated");
}

export async function grantAction(formData: FormData) {
  const session = await requireActor();
  try {
    await grantAssignment(
      {
        actor: session.actor,
        correlationId: correlationId(),
        idempotencyKey: String(formData.get("idempotencyKey")),
      },
      {
        userId: String(formData.get("userId")),
        roleKey: String(formData.get("roleKey")) as RoleKey,
        scopeKind: String(formData.get("scopeKind")) as
          "ORGANISATION" | "CLIENT" | "EVENT" | "WORKSTREAM" | "GOVERNANCE",
        clientId: String(formData.get("clientId") ?? "") || null,
        eventId: String(formData.get("eventId") ?? "") || null,
        departmentId: String(formData.get("departmentId") ?? "") || null,
        workstreamId: String(formData.get("workstreamId") ?? "") || null,
        endsAt: String(formData.get("endsAt") ?? "") || null,
        reason: String(formData.get("reason") ?? ""),
        idempotencyRequest: {},
      },
    );
  } catch (error) {
    fail("/app/admin/access", error);
  }
  redirect("/app/admin/access?notice=Assignment granted");
}

export async function assignmentStatusAction(formData: FormData) {
  const session = await requireActor();
  try {
    await setAssignmentStatus(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        id: String(formData.get("id")),
        status: String(formData.get("status")) as "SUSPENDED" | "REVOKED",
        reason: String(formData.get("reason") ?? ""),
        version: Number(formData.get("version")),
      },
    );
  } catch (error) {
    fail("/app/admin/access", error);
  }
  redirect("/app/admin/access?notice=Assignment updated");
}

export async function approvalSubmitAction(formData: FormData) {
  const session = await requireActor();
  try {
    await submitApproval(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        kind: String(formData.get("kind")) as "EVENT_ARCHIVE" | "GOVERNANCE_RULE",
        eventId: String(formData.get("eventId") ?? "") || null,
        title: String(formData.get("title") ?? ""),
        detail: String(formData.get("detail") ?? ""),
      },
    );
  } catch (error) {
    fail("/app/admin/approvals", error);
  }
  redirect("/app/admin/approvals?notice=Request submitted");
}

export async function approvalDecideAction(formData: FormData) {
  const session = await requireActor();
  try {
    await decideApproval(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        id: String(formData.get("id")),
        version: Number(formData.get("version")),
        decision: String(formData.get("decision")) as "APPROVED" | "REJECTED",
        reason: String(formData.get("reason") ?? ""),
      },
    );
  } catch (error) {
    fail("/app/admin/approvals", error);
  }
  redirect("/app/admin/approvals?notice=Decision recorded");
}

export async function departmentAction(formData: FormData) {
  const session = await requireActor();
  try {
    await createDepartment(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        code: String(formData.get("code") ?? "").toUpperCase(),
        name: String(formData.get("name") ?? ""),
      },
    );
  } catch (error) {
    fail("/app/admin/departments", error);
  }
  redirect("/app/admin/departments?notice=Department created");
}

export async function departmentStatusAction(formData: FormData) {
  const session = await requireActor();
  try {
    await setDepartmentStatus(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        id: String(formData.get("id")),
        status: String(formData.get("status")) as "ACTIVE" | "INACTIVE",
        version: Number(formData.get("version")),
        reason: String(formData.get("reason") ?? ""),
      },
    );
  } catch (error) {
    fail("/app/admin/departments", error);
  }
  redirect("/app/admin/departments?notice=Department updated");
}

export async function workstreamAction(formData: FormData) {
  const session = await requireActor();
  const eventId = String(formData.get("eventId"));
  try {
    await createWorkstream(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        eventId,
        departmentId: String(formData.get("departmentId")),
        code: String(formData.get("code") ?? "").toUpperCase(),
        name: String(formData.get("name") ?? ""),
      },
    );
  } catch (error) {
    fail(`/app/events/${eventId}/workstreams`, error);
  }
  redirect(`/app/events/${eventId}/workstreams?notice=Workstream created`);
}

export async function operateAction(formData: FormData) {
  const session = await requireActor();
  const eventId = String(formData.get("eventId"));
  try {
    await operateWorkstream(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        id: String(formData.get("id")),
        version: Number(formData.get("version")),
        note: String(formData.get("note") ?? ""),
      },
    );
  } catch (error) {
    fail(`/app/events/${eventId}/workstreams`, error);
  }
  redirect(`/app/events/${eventId}/workstreams?notice=Workstream note saved`);
}

export async function organisationAction(formData: FormData) {
  const session = await requireActor();
  try {
    await updateOrganisation(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {
        version: Number(formData.get("version")),
        displayName: String(formData.get("displayName") ?? ""),
        legalName: String(formData.get("legalName") ?? ""),
        status: String(formData.get("status") ?? "ACTIVE"),
      },
    );
  } catch (error) {
    fail("/app/admin/system", error);
  }
  redirect("/app?notice=Organisation updated");
}

export async function exportRequestAction() {
  const session = await requireActor();
  try {
    await requestAuditExport(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      {},
    );
  } catch (error) {
    fail("/app/admin/audit", error);
  }
  redirect("/app/admin/audit?notice=Export requested");
}

export async function exportSettleAction(formData: FormData) {
  const session = await requireActor();
  let csv = "";
  try {
    csv = await settleAuditExport(
      { actor: session.actor, correlationId: correlationId(), idempotencyKey: null },
      String(formData.get("id")),
    );
  } catch (error) {
    fail("/app/admin/audit", error);
  }
  redirect(`/app/admin/audit?notice=${encodeURIComponent("Export settled")}&bytes=${csv.length}`);
}
