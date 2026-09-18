import { randomUUID } from "node:crypto";
import { one, rows, withTx } from "./db";
import { AppError } from "./errors";
import { authorize, isOrgWideCeo, type ActorState } from "./policy";
import type { RoleKey } from "./permissions";
import { bump, requirePermission, writeAudit, type CommandContext } from "./service";

const PROTECTED_FROM_ADMIN = new Set<RoleKey>(["CEO", "EVENT_DIRECTOR", "SYSTEM_ADMINISTRATOR"]);

export async function inviteUser(
  ctx: CommandContext,
  input: { email: string; displayName: string },
): Promise<{ id: string }> {
  await requirePermission(
    ctx.actor,
    "user.invite",
    { organisationId: ctx.actor.organisationId },
    ctx.correlationId,
    "user.invited",
  );
  return withTx(async (db) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO users (id, external_subject, email, display_name, status, synthetic) VALUES ($1,$2,$3,$4,'INVITED',true)`,
      [id, `invite:${id}`, input.email, input.displayName],
    );
    await db.query(
      `INSERT INTO memberships (id, organisation_id, user_id, status) VALUES ($1,$2,$3,'ACTIVE')`,
      [randomUUID(), ctx.actor.organisationId, id],
    );
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "user.invited",
      outcome: "SUCCESS",
      resourceType: "user",
      resourceId: id,
      after: { email: input.email },
    });
    return { id };
  });
}

export async function setUserStatus(
  ctx: CommandContext,
  input: { userId: string; status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED"; reason: string },
): Promise<void> {
  const permission =
    input.status === "ACTIVE"
      ? "user.activate"
      : input.status === "SUSPENDED"
        ? "user.suspend"
        : "user.deactivate";
  const current = await withTx((db) =>
    one<{ status: string }>(db, `SELECT status FROM users WHERE id = $1`, [input.userId]),
  );
  if (input.status === "ACTIVE" && current?.status === "SUSPENDED") {
    await requirePermission(
      ctx.actor,
      "user.reinstate",
      { organisationId: ctx.actor.organisationId },
      ctx.correlationId,
      "user.reinstated",
    );
  } else {
    await requirePermission(
      ctx.actor,
      permission,
      { organisationId: ctx.actor.organisationId },
      ctx.correlationId,
      "user.status_changed",
    );
  }
  if (!input.reason.trim()) throw new AppError("VALIDATION_FAILED", "A reason is required.", 422);
  await withTx(async (db) => {
    const member = await one(
      db,
      `SELECT id FROM memberships WHERE user_id = $1 AND organisation_id = $2`,
      [input.userId, ctx.actor.organisationId],
    );
    if (!member) throw new AppError("NOT_FOUND", "Not found.", 404);
    await db.query(
      `UPDATE users SET status = $2, updated_at = now(), version = version + 1 WHERE id = $1`,
      [input.userId, input.status],
    );
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "user.status_changed",
      outcome: "SUCCESS",
      resourceType: "user",
      resourceId: input.userId,
      reason: input.reason,
      after: { status: input.status },
    });
  });
}

export async function grantAssignment(
  ctx: CommandContext,
  input: {
    userId: string;
    roleKey: RoleKey;
    scopeKind: "ORGANISATION" | "CLIENT" | "EVENT" | "WORKSTREAM" | "GOVERNANCE";
    clientId?: string | null;
    eventId?: string | null;
    departmentId?: string | null;
    workstreamId?: string | null;
    endsAt?: string | null;
    reason: string;
    idempotencyRequest: unknown;
  },
): Promise<{ id: string }> {
  await requirePermission(
    ctx.actor,
    "assignment.grant",
    { organisationId: ctx.actor.organisationId },
    ctx.correlationId,
    "assignment.granted",
  );
  if (!input.reason.trim()) throw new AppError("VALIDATION_FAILED", "A reason is required.", 422);
  const actorRole = ctx.actor.assignments.find((grant) => grant.status === "ACTIVE")?.roleKey;
  if (actorRole === "SYSTEM_ADMINISTRATOR" && PROTECTED_FROM_ADMIN.has(input.roleKey)) {
    await withTx((db) =>
      writeAudit(db, ctx.actor, ctx.correlationId, {
        action: "assignment.granted",
        outcome: "DENIED",
        resourceType: "assignment",
        reason: "PRIVILEGE_ESCALATION",
      }),
    );
    throw new AppError("FORBIDDEN", "You cannot grant that role.", 403);
  }
  if (actorRole === "EVENT_DIRECTOR" && PROTECTED_FROM_ADMIN.has(input.roleKey)) {
    await withTx((db) =>
      writeAudit(db, ctx.actor, ctx.correlationId, {
        action: "assignment.granted",
        outcome: "DENIED",
        resourceType: "assignment",
        reason: "PRIVILEGE_ESCALATION",
      }),
    );
    throw new AppError("FORBIDDEN", "You cannot grant that role.", 403);
  }
  if (
    input.roleKey === "CEO" &&
    (input.clientId || input.eventId || input.departmentId || input.scopeKind !== "ORGANISATION")
  ) {
    throw new AppError("VALIDATION_FAILED", "A CEO assignment must be organisation-wide.", 422);
  }
  return withTx(async (db) => {
    if (input.roleKey === "DEPARTMENT_LEAD") {
      if (!input.eventId || !input.departmentId || !input.workstreamId) {
        throw new AppError(
          "VALIDATION_FAILED",
          "A department lead needs an event, department and workstream.",
          422,
        );
      }
      const workstream = await one<{
        organisation_id: string;
        event_id: string;
        department_id: string;
        status: string;
        department_status: string;
      }>(
        db,
        `SELECT w.organisation_id, w.event_id, w.department_id, w.status, d.status AS department_status
         FROM workstreams w JOIN departments d ON d.id = w.department_id WHERE w.id = $1`,
        [input.workstreamId],
      );
      if (!workstream || workstream.organisation_id !== ctx.actor.organisationId)
        throw new AppError(
          "VALIDATION_FAILED",
          "That workstream is not in this organisation.",
          422,
        );
      if (workstream.event_id !== input.eventId)
        throw new AppError("VALIDATION_FAILED", "That workstream belongs to another event.", 422);
      if (workstream.department_id !== input.departmentId)
        throw new AppError(
          "VALIDATION_FAILED",
          "That department does not own the workstream.",
          422,
        );
      if (workstream.status !== "ACTIVE" || workstream.department_status !== "ACTIVE")
        throw new AppError(
          "VALIDATION_FAILED",
          "Inactive departments or workstreams cannot be assigned.",
          422,
        );
    }
    const role = await one<{ id: string }>(
      db,
      `SELECT id FROM roles WHERE organisation_id = $1 AND key = $2`,
      [ctx.actor.organisationId, input.roleKey],
    );
    if (!role) throw new AppError("VALIDATION_FAILED", "Unknown role.", 422);
    const id = randomUUID();
    await db.query(
      `INSERT INTO assignments (id, organisation_id, client_id, event_id, department_id, workstream_id, user_id, role_id, scope_kind, governance_mandate, ends_at, status, granted_by_user_id, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ACTIVE',$12,$13)`,
      [
        id,
        ctx.actor.organisationId,
        input.clientId ?? null,
        input.eventId ?? null,
        input.departmentId ?? null,
        input.workstreamId ?? null,
        input.userId,
        role.id,
        input.scopeKind,
        input.scopeKind === "GOVERNANCE",
        input.endsAt ?? null,
        ctx.actor.userId,
        input.reason,
      ],
    );
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "assignment.granted",
      outcome: "SUCCESS",
      resourceType: "assignment",
      resourceId: id,
      clientId: input.clientId,
      eventId: input.eventId,
      reason: input.reason,
      after: input,
    });
    return { id };
  });
}

export async function setAssignmentStatus(
  ctx: CommandContext,
  input: { id: string; status: "SUSPENDED" | "REVOKED"; reason: string; version: number },
): Promise<void> {
  const permission = input.status === "SUSPENDED" ? "assignment.suspend" : "assignment.revoke";
  await requirePermission(
    ctx.actor,
    permission,
    { organisationId: ctx.actor.organisationId },
    ctx.correlationId,
    "assignment.changed",
  );
  if (!input.reason.trim()) throw new AppError("VALIDATION_FAILED", "A reason is required.", 422);
  await withTx(async (db) => {
    const current = await one<{
      id: string;
      organisation_id: string;
      version: number;
      role_key: RoleKey;
    }>(
      db,
      `SELECT a.id, a.organisation_id, a.version, r.key AS role_key FROM assignments a JOIN roles r ON r.id = a.role_id WHERE a.id = $1`,
      [input.id],
    );
    if (!current || current.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    const actorIsAdmin = ctx.actor.assignments.some(
      (grant) => grant.roleKey === "SYSTEM_ADMINISTRATOR" || grant.roleKey === "EVENT_DIRECTOR",
    );
    const actorIsCeo = isOrgWideCeo(ctx.actor);
    if (!actorIsCeo && actorIsAdmin && PROTECTED_FROM_ADMIN.has(current.role_key)) {
      await writeAudit(db, ctx.actor, ctx.correlationId, {
        action: "assignment.changed",
        outcome: "DENIED",
        resourceType: "assignment",
        resourceId: input.id,
        reason: "PRIVILEGE_ESCALATION",
      });
      throw new AppError("FORBIDDEN", "You cannot change that assignment.", 403);
    }
    if (current.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    await db.query(`UPDATE assignments SET status = $2 WHERE id = $1`, [input.id, input.status]);
    await bump(db, "assignments", input.id, input.version);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: input.status === "REVOKED" ? "assignment.revoked" : "assignment.suspended",
      outcome: "SUCCESS",
      resourceType: "assignment",
      resourceId: input.id,
      reason: input.reason,
    });
  });
}

export async function submitApproval(
  ctx: CommandContext,
  input: {
    kind: "EVENT_ARCHIVE" | "GOVERNANCE_RULE";
    eventId?: string | null;
    title: string;
    detail: string;
  },
): Promise<{ id: string }> {
  await requirePermission(
    ctx.actor,
    "approval.request",
    { organisationId: ctx.actor.organisationId, eventId: input.eventId ?? null },
    ctx.correlationId,
    "approval.submitted",
  );
  return withTx(async (db) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO approval_requests (id, organisation_id, event_id, kind, status, title, detail, submitted_by_user_id)
       VALUES ($1,$2,$3,$4,'SUBMITTED',$5,$6,$7)`,
      [
        id,
        ctx.actor.organisationId,
        input.eventId ?? null,
        input.kind,
        input.title,
        input.detail,
        ctx.actor.userId,
      ],
    );
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "approval.submitted",
      outcome: "SUCCESS",
      resourceType: "approval_request",
      resourceId: id,
      eventId: input.eventId,
      after: input,
    });
    return { id };
  });
}

export async function decideApproval(
  ctx: CommandContext,
  input: { id: string; version: number; decision: "APPROVED" | "REJECTED"; reason: string },
): Promise<void> {
  await requirePermission(
    ctx.actor,
    "approval.decide",
    { organisationId: ctx.actor.organisationId },
    ctx.correlationId,
    "approval.decided",
  );
  if (
    ctx.actor.assignments.some((grant) => grant.roleKey === "SYSTEM_ADMINISTRATOR") &&
    !isOrgWideCeo(ctx.actor)
  ) {
    throw new AppError(
      "FORBIDDEN",
      "Technical administration cannot decide business records.",
      403,
    );
  }
  if (!input.reason.trim()) throw new AppError("VALIDATION_FAILED", "A reason is required.", 422);
  await withTx(async (db) => {
    const request = await one<{
      id: string;
      organisation_id: string;
      event_id: string | null;
      kind: string;
      status: string;
      submitted_by_user_id: string;
      version: number;
    }>(
      db,
      `SELECT id, organisation_id, event_id, kind, status, submitted_by_user_id, version FROM approval_requests WHERE id = $1`,
      [input.id],
    );
    if (!request || request.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    if (request.status !== "SUBMITTED")
      throw new AppError("VALIDATION_FAILED", "This request is already decided.", 422);
    if (request.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    const self = request.submitted_by_user_id === ctx.actor.userId;
    if (self && !isOrgWideCeo(ctx.actor)) {
      await writeAudit(db, ctx.actor, ctx.correlationId, {
        action: "approval.decided",
        outcome: "DENIED",
        resourceType: "approval_request",
        resourceId: input.id,
        reason: "SELF_APPROVAL",
      });
      throw new AppError("FORBIDDEN", "You cannot decide your own request.", 403);
    }
    if (request.kind === "EVENT_ARCHIVE" && !isOrgWideCeo(ctx.actor)) {
      throw new AppError("FORBIDDEN", "Only the CEO can complete event archive.", 403);
    }
    await db.query(
      `UPDATE approval_requests SET status = $2, decided_by_user_id = $3, decision_reason = $4 WHERE id = $1`,
      [input.id, input.decision, ctx.actor.userId, input.reason],
    );
    await bump(db, "approval_requests", input.id, input.version);
    if (input.decision === "APPROVED" && request.kind === "EVENT_ARCHIVE" && request.event_id) {
      await db.query(
        `UPDATE events SET status = 'ARCHIVED', archived_at = now(), version = version + 1, updated_at = now() WHERE id = $1`,
        [request.event_id],
      );
    }
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "approval.decided",
      outcome: "SUCCESS",
      resourceType: "approval_request",
      resourceId: input.id,
      eventId: request.event_id,
      reason: input.reason,
      after: { decision: input.decision },
    });
  });
}

export async function searchAudit(
  actor: ActorState,
  filter: { action?: string; outcome?: string; eventId?: string; query?: string },
): Promise<Record<string, unknown>[]> {
  if (authorize(actor, "audit.view", { organisationId: actor.organisationId }).outcome !== "ALLOW")
    return [];
  return withTx(async (db) => {
    const params: unknown[] = [actor.organisationId];
    let sql = `SELECT id, occurred_at, action, outcome, actor_user_id, resource_type, resource_id, correlation_id, reason, client_id, event_id
      FROM audit_events WHERE organisation_id = $1`;
    if (filter.action) {
      params.push(filter.action);
      sql += ` AND action = $${params.length}`;
    }
    if (filter.outcome) {
      params.push(filter.outcome);
      sql += ` AND outcome = $${params.length}`;
    }
    if (filter.eventId) {
      params.push(filter.eventId);
      sql += ` AND event_id = $${params.length}`;
    }
    sql += ` ORDER BY occurred_at DESC LIMIT 200`;
    const result = await rows<Record<string, unknown>>(db, sql, params);
    return result.filter(
      (row) =>
        !filter.query || JSON.stringify(row).toLowerCase().includes(filter.query.toLowerCase()),
    );
  });
}

export async function requestAuditExport(
  ctx: CommandContext,
  filter: Record<string, unknown>,
): Promise<{ id: string }> {
  await requirePermission(
    ctx.actor,
    "audit.export.request",
    { organisationId: ctx.actor.organisationId },
    ctx.correlationId,
    "audit.export_requested",
  );
  return withTx(async (db) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO audit_exports (id, organisation_id, requested_by_user_id, status, filter_json) VALUES ($1,$2,$3,'REQUESTED',$4::jsonb)`,
      [id, ctx.actor.organisationId, ctx.actor.userId, JSON.stringify(filter)],
    );
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "audit.export_requested",
      outcome: "SUCCESS",
      resourceType: "audit_export",
      resourceId: id,
    });
    return { id };
  });
}

export async function settleAuditExport(ctx: CommandContext, exportId: string): Promise<string> {
  await requirePermission(
    ctx.actor,
    "audit.export.settle",
    { organisationId: ctx.actor.organisationId },
    ctx.correlationId,
    "audit.export_settled",
  );
  return withTx(async (db) => {
    const existing = await one<{
      id: string;
      organisation_id: string;
      filter_json: Record<string, unknown>;
    }>(db, `SELECT id, organisation_id, filter_json FROM audit_exports WHERE id = $1`, [exportId]);
    if (!existing || existing.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    await db.query(
      `UPDATE audit_exports SET status = 'SETTLED', settled_by_user_id = $2, settled_at = now() WHERE id = $1`,
      [exportId, ctx.actor.userId],
    );
    const events = await rows<Record<string, unknown>>(
      db,
      `SELECT occurred_at, action, outcome, resource_type, resource_id, correlation_id, reason FROM audit_events WHERE organisation_id = $1 ORDER BY occurred_at`,
      [ctx.actor.organisationId],
    );
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "audit.export_settled",
      outcome: "SUCCESS",
      resourceType: "audit_export",
      resourceId: exportId,
    });
    const header = "occurred_at,action,outcome,resource_type,resource_id,correlation_id,reason";
    const lines = events.map((row) =>
      [
        row.occurred_at,
        row.action,
        row.outcome,
        row.resource_type,
        row.resource_id,
        row.correlation_id,
        row.reason,
      ]
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(","),
    );
    return [header, ...lines].join("\n");
  });
}

export async function createDepartment(
  ctx: CommandContext,
  input: { code: string; name: string },
): Promise<{ id: string }> {
  await requirePermission(
    ctx.actor,
    "department.manage",
    { organisationId: ctx.actor.organisationId },
    ctx.correlationId,
    "department.created",
  );
  return withTx(async (db) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO departments (id, organisation_id, code, name, status) VALUES ($1,$2,$3,$4,'ACTIVE')`,
      [id, ctx.actor.organisationId, input.code, input.name],
    );
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "department.created",
      outcome: "SUCCESS",
      resourceType: "department",
      resourceId: id,
      after: input,
    });
    return { id };
  });
}

export async function setDepartmentStatus(
  ctx: CommandContext,
  input: { id: string; status: "ACTIVE" | "INACTIVE"; version: number; reason: string },
): Promise<void> {
  await requirePermission(
    ctx.actor,
    "department.manage",
    { organisationId: ctx.actor.organisationId },
    ctx.correlationId,
    "department.updated",
  );
  await withTx(async (db) => {
    const current = await one<{ version: number; organisation_id: string }>(
      db,
      `SELECT version, organisation_id FROM departments WHERE id = $1`,
      [input.id],
    );
    if (!current || current.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    if (current.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    await db.query(`UPDATE departments SET status = $2 WHERE id = $1`, [input.id, input.status]);
    await bump(db, "departments", input.id, input.version);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "department.updated",
      outcome: "SUCCESS",
      resourceType: "department",
      resourceId: input.id,
      reason: input.reason,
      after: { status: input.status },
    });
  });
}

export async function createWorkstream(
  ctx: CommandContext,
  input: { eventId: string; departmentId: string; code: string; name: string },
): Promise<{ id: string }> {
  return withTx(async (db) => {
    const event = await one<{ organisation_id: string; client_id: string }>(
      db,
      `SELECT organisation_id, client_id FROM events WHERE id = $1`,
      [input.eventId],
    );
    if (!event || event.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    await requirePermission(
      ctx.actor,
      "workstream.manage",
      {
        organisationId: event.organisation_id,
        eventId: input.eventId,
        clientId: event.client_id,
        eventClientId: event.client_id,
      },
      ctx.correlationId,
      "workstream.created",
    );
    const id = randomUUID();
    await db.query(
      `INSERT INTO workstreams (id, organisation_id, event_id, department_id, code, name, status) VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE')`,
      [id, ctx.actor.organisationId, input.eventId, input.departmentId, input.code, input.name],
    );
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "workstream.created",
      outcome: "SUCCESS",
      resourceType: "workstream",
      resourceId: id,
      eventId: input.eventId,
      after: input,
    });
    return { id };
  });
}

export async function operateWorkstream(
  ctx: CommandContext,
  input: { id: string; version: number; note: string },
): Promise<void> {
  await withTx(async (db) => {
    const workstream = await one<{
      id: string;
      organisation_id: string;
      event_id: string;
      department_id: string;
      version: number;
      status: string;
    }>(
      db,
      `SELECT id, organisation_id, event_id, department_id, version, status FROM workstreams WHERE id = $1`,
      [input.id],
    );
    if (!workstream || workstream.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    const scope = {
      organisationId: workstream.organisation_id,
      eventId: workstream.event_id,
      departmentId: workstream.department_id,
      workstreamId: workstream.id,
    };
    if (authorize(ctx.actor, "workstream.operate", scope).outcome === "DENY") {
      throw new AppError("NOT_FOUND", "Not found.", 404);
    }
    if (workstream.status !== "ACTIVE")
      throw new AppError("VALIDATION_FAILED", "Inactive workstreams cannot be operated.", 422);
    if (workstream.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    await db.query(`UPDATE workstreams SET operational_note = $2 WHERE id = $1`, [
      input.id,
      input.note,
    ]);
    await bump(db, "workstreams", input.id, input.version);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "workstream.operated",
      outcome: "SUCCESS",
      resourceType: "workstream",
      resourceId: input.id,
      eventId: workstream.event_id,
      after: { note: input.note },
    });
  });
}

export async function createProgramme(
  ctx: CommandContext,
  input: { clientId: string; name: string; startsAt?: string | null; endsAt?: string | null },
): Promise<{ id: string }> {
  await requirePermission(
    ctx.actor,
    "programme.create",
    { organisationId: ctx.actor.organisationId, clientId: input.clientId },
    ctx.correlationId,
    "programme.created",
  );
  return withTx(async (db) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO event_programmes (id, organisation_id, client_id, name, status, starts_at, ends_at) VALUES ($1,$2,$3,$4,'ACTIVE',$5,$6)`,
      [
        id,
        ctx.actor.organisationId,
        input.clientId,
        input.name,
        input.startsAt ?? null,
        input.endsAt ?? null,
      ],
    );
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "programme.created",
      outcome: "SUCCESS",
      resourceType: "programme",
      resourceId: id,
      clientId: input.clientId,
      after: input,
    });
    return { id };
  });
}

export async function updateOrganisation(
  ctx: CommandContext,
  input: { version: number; displayName: string; legalName: string; status: string },
): Promise<void> {
  await requirePermission(
    ctx.actor,
    "organisation.manage",
    { organisationId: ctx.actor.organisationId },
    ctx.correlationId,
    "organisation.updated",
  );
  await withTx(async (db) => {
    const current = await one<{ version: number }>(
      db,
      `SELECT version FROM organisations WHERE id = $1`,
      [ctx.actor.organisationId],
    );
    if (!current || current.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    await db.query(
      `UPDATE organisations SET display_name = $2, legal_name = $3, status = $4 WHERE id = $1`,
      [ctx.actor.organisationId, input.displayName, input.legalName, input.status],
    );
    await bump(db, "organisations", ctx.actor.organisationId, input.version);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "organisation.updated",
      outcome: "SUCCESS",
      resourceType: "organisation",
      resourceId: ctx.actor.organisationId,
      after: input,
    });
  });
}

export async function listDirectory(actor: ActorState): Promise<Record<string, unknown>[]> {
  return withTx((db) =>
    rows(
      db,
      `SELECT u.id, u.display_name, u.email, u.status FROM users u JOIN memberships m ON m.user_id = u.id WHERE m.organisation_id = $1 ORDER BY u.display_name`,
      [actor.organisationId],
    ),
  );
}

export async function listAssignments(actor: ActorState): Promise<Record<string, unknown>[]> {
  return withTx((db) =>
    rows(
      db,
      `SELECT a.*, u.display_name, r.key AS role_key, r.name AS role_name FROM assignments a
       JOIN users u ON u.id = a.user_id JOIN roles r ON r.id = a.role_id
       WHERE a.organisation_id = $1 ORDER BY a.created_at DESC`,
      [actor.organisationId],
    ),
  );
}

export async function readiness(): Promise<{ database: string; migrations: string }> {
  return withTx(async (db) => {
    await db.query("SELECT 1");
    const migration = await one<{ id: string }>(
      db,
      `SELECT id FROM schema_migrations WHERE id = '001_foundation'`,
    );
    return { database: "ok", migrations: migration ? "APPLIED" : "MISSING" };
  });
}

export type { ActorState };
