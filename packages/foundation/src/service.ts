import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type pg from "pg";
import { sha256 } from "./config";
import { one, rows, withTx, type Queryable } from "./db";
import { AppError } from "./errors";
import {
  authorize,
  isOrgWideCeo,
  PHASE_EDGES,
  plannerMayTransition,
  S01_DISABLED_TARGETS,
  type ActorState,
  type AssignmentGrant,
  type ResourceScope,
} from "./policy";
import {
  MEF_SLOTS,
  PERMISSION_KEYS,
  PERMISSION_REGISTRY,
  type PermissionKey,
  type RoleKey,
} from "./permissions";
import { redact } from "./redact";

type Client = pg.PoolClient;

export interface CommandContext {
  actor: ActorState;
  correlationId: string;
  idempotencyKey?: string | null;
}

interface AuditInput {
  action: string;
  outcome: "SUCCESS" | "DENIED" | "FAILED";
  resourceType: string;
  resourceId?: string | null;
  clientId?: string | null;
  eventId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(
  db: Queryable,
  actor: ActorState | null,
  correlationId: string,
  input: AuditInput,
): Promise<void> {
  const metadata = redact(input.metadata ?? {}) as Record<string, unknown>;
  await db.query(
    `INSERT INTO audit_events (
      id, actor_type, actor_user_id, service, action, outcome, organisation_id, client_id, event_id,
      resource_type, resource_id, correlation_id, reason, before_hash, after_hash, metadata
    ) VALUES ($1,'USER',$2,'event-os',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)`,
    [
      randomUUID(),
      actor?.userId ?? null,
      input.action,
      input.outcome,
      actor?.organisationId ?? null,
      input.clientId ?? null,
      input.eventId ?? null,
      input.resourceType,
      input.resourceId ?? null,
      correlationId,
      input.reason ?? null,
      input.before ? sha256(JSON.stringify(input.before)) : null,
      input.after ? sha256(JSON.stringify(input.after)) : null,
      JSON.stringify(metadata),
    ],
  );
}

async function deny(
  actor: ActorState,
  correlationId: string,
  action: string,
  code: string,
): Promise<never> {
  await withTx(async (db) => {
    await writeAudit(db, actor, correlationId, {
      action,
      outcome: "DENIED",
      resourceType: "authorization",
      reason: code,
    });
  });
  const concealed = code === "NO_GRANT" || code === "ORGANISATION_MISMATCH";
  throw new AppError(
    concealed ? "NOT_FOUND" : "FORBIDDEN",
    concealed ? "Not found." : "You cannot do that.",
    concealed ? 404 : 403,
  );
}

export function requirePermission(
  actor: ActorState,
  permission: PermissionKey,
  resource: ResourceScope,
  correlationId: string,
  action: string,
): Promise<void> {
  const decision = authorize(actor, permission, resource);
  if (decision.outcome === "DENY") return deny(actor, correlationId, action, decision.code);
  return Promise.resolve();
}

async function replay<T>(
  db: Queryable,
  ctx: CommandContext,
  request: unknown,
): Promise<T | undefined> {
  if (!ctx.idempotencyKey)
    throw new AppError("VALIDATION_FAILED", "An idempotency key is required.", 422);
  const hash = sha256(JSON.stringify(request));
  const existing = await one<{ request_hash: string; response_json: T }>(
    db,
    `SELECT request_hash, response_json FROM idempotency_records WHERE organisation_id = $1 AND actor_user_id = $2 AND idempotency_key = $3 FOR UPDATE`,
    [ctx.actor.organisationId, ctx.actor.userId, ctx.idempotencyKey],
  );
  if (!existing) return undefined;
  if (existing.request_hash !== hash)
    throw new AppError(
      "IDEMPOTENCY_CONFLICT",
      "This retry does not match the original request.",
      409,
    );
  return existing.response_json;
}

async function remember(
  db: Queryable,
  ctx: CommandContext,
  request: unknown,
  response: unknown,
): Promise<void> {
  await db.query(
    `INSERT INTO idempotency_records (id, organisation_id, actor_user_id, idempotency_key, request_hash, response_json)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      randomUUID(),
      ctx.actor.organisationId,
      ctx.actor.userId,
      ctx.idempotencyKey,
      sha256(JSON.stringify(request)),
      JSON.stringify(response),
    ],
  );
}

export async function loadActor(
  db: Queryable,
  userId: string,
  organisationId: string,
  now = new Date().toISOString(),
): Promise<ActorState> {
  const user = await one<{ status: ActorState["userStatus"] }>(
    db,
    `SELECT status FROM users WHERE id = $1`,
    [userId],
  );
  const membership = await one<{ status: "ACTIVE" | "SUSPENDED" }>(
    db,
    `SELECT status FROM memberships WHERE user_id = $1 AND organisation_id = $2`,
    [userId, organisationId],
  );
  const grants = await rows<{
    id: string;
    organisation_id: string;
    client_id: string | null;
    event_id: string | null;
    department_id: string | null;
    workstream_id: string | null;
    scope_kind: AssignmentGrant["scopeKind"];
    governance_mandate: boolean;
    status: AssignmentGrant["status"];
    starts_at: Date | null;
    ends_at: Date | null;
    role_key: RoleKey;
    department_status: "ACTIVE" | "INACTIVE" | null;
    workstream_status: "ACTIVE" | "INACTIVE" | null;
    event_client_id: string | null;
  }>(
    db,
    `SELECT a.id, a.organisation_id, a.client_id, a.event_id, a.department_id, a.workstream_id, a.scope_kind,
            a.governance_mandate, a.status, a.starts_at, a.ends_at, r.key AS role_key,
            d.status AS department_status, w.status AS workstream_status, e.client_id AS event_client_id
     FROM assignments a
     JOIN roles r ON r.id = a.role_id
     LEFT JOIN departments d ON d.id = a.department_id
     LEFT JOIN workstreams w ON w.id = a.workstream_id
     LEFT JOIN events e ON e.id = a.event_id
     WHERE a.user_id = $1 AND a.organisation_id = $2`,
    [userId, organisationId],
  );
  return {
    userId,
    userStatus: user?.status ?? "DEACTIVATED",
    organisationId,
    membershipStatus: membership?.status ?? "NONE",
    now,
    assignments: grants.map((grant) => ({
      id: grant.id,
      organisationId: grant.organisation_id,
      clientId: grant.client_id,
      eventId: grant.event_id,
      departmentId: grant.department_id,
      workstreamId: grant.workstream_id,
      roleKey: grant.role_key,
      scopeKind: grant.scope_kind,
      governanceMandate: grant.governance_mandate,
      status:
        grant.ends_at && grant.ends_at.toISOString() <= now && grant.status === "ACTIVE"
          ? "EXPIRED"
          : grant.status,
      startsAt: grant.starts_at?.toISOString() ?? null,
      endsAt: grant.ends_at?.toISOString() ?? null,
      departmentStatus: grant.department_status,
      workstreamStatus: grant.workstream_status,
      eventClientId: grant.event_client_id,
    })),
  };
}

function orgResource(actor: ActorState): ResourceScope {
  return { organisationId: actor.organisationId };
}

export function sealSession(sessionId: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(sessionId).digest("base64url");
  return `${sessionId}.${mac}`;
}

export function openSession(token: string, secret: string): string | null {
  const [sessionId, mac] = token.split(".");
  if (!sessionId || !mac) return null;
  const expected = createHmac("sha256", secret).update(sessionId).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return sessionId;
}

export async function signInFixture(input: {
  userId: string;
  secret: string;
  allowFixtures: boolean;
  correlationId: string;
}): Promise<{ token: string; organisationId: string }> {
  if (!input.allowFixtures)
    throw new AppError("DEPENDENCY_UNAVAILABLE", "Synthetic sign-in is not enabled.", 503);
  return withTx(async (db) => {
    const user = await one<{ id: string; status: string; synthetic: boolean }>(
      db,
      `SELECT id, status, synthetic FROM users WHERE id = $1`,
      [input.userId],
    );
    if (!user?.synthetic)
      throw new AppError("AUTH_REQUIRED", "Sign in is not available for that identity.", 401);
    if (user.status === "SUSPENDED")
      throw new AppError("FORBIDDEN", "This identity is suspended.", 403);
    if (user.status !== "ACTIVE")
      throw new AppError("ACCESS_PENDING", "This identity is not active.", 403);
    const membership = await one<{ organisation_id: string }>(
      db,
      `SELECT organisation_id FROM memberships WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at LIMIT 1`,
      [user.id],
    );
    if (!membership)
      throw new AppError("ACCESS_PENDING", "No organisation membership is active.", 403);
    const now = new Date();
    const sessionId = randomUUID();
    await db.query(
      `INSERT INTO sessions (id, user_id, organisation_id, idle_expires_at, absolute_expires_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        sessionId,
        user.id,
        membership.organisation_id,
        new Date(now.getTime() + 30 * 60 * 1000),
        new Date(now.getTime() + 12 * 60 * 60 * 1000),
      ],
    );
    await db.query(
      `UPDATE users SET last_authenticated_at = now(), updated_at = now() WHERE id = $1`,
      [user.id],
    );
    const actor = await loadActor(db, user.id, membership.organisation_id);
    await writeAudit(db, actor, input.correlationId, {
      action: "auth.signed_in",
      outcome: "SUCCESS",
      resourceType: "session",
      resourceId: sessionId,
    });
    return {
      token: sealSession(sessionId, input.secret),
      organisationId: membership.organisation_id,
    };
  });
}

export async function resolveSession(
  token: string,
  secret: string,
): Promise<{ sessionId: string; actor: ActorState } | null> {
  const sessionId = openSession(token, secret);
  if (!sessionId) return null;
  return withTx(async (db) => {
    const session = await one<{
      user_id: string;
      organisation_id: string;
      revoked_at: Date | null;
      idle_expires_at: Date;
      absolute_expires_at: Date;
    }>(
      db,
      `SELECT user_id, organisation_id, revoked_at, idle_expires_at, absolute_expires_at FROM sessions WHERE id = $1`,
      [sessionId],
    );
    const now = new Date();
    if (
      !session ||
      session.revoked_at ||
      session.idle_expires_at <= now ||
      session.absolute_expires_at <= now
    )
      return null;
    await db.query(`UPDATE sessions SET last_seen_at = now(), idle_expires_at = $2 WHERE id = $1`, [
      sessionId,
      new Date(now.getTime() + 30 * 60 * 1000),
    ]);
    const actor = await loadActor(db, session.user_id, session.organisation_id, now.toISOString());
    return { sessionId, actor };
  });
}

export async function signOut(
  sessionId: string,
  actor: ActorState,
  correlationId: string,
): Promise<void> {
  await withTx(async (db) => {
    await db.query(`UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [
      sessionId,
    ]);
    await writeAudit(db, actor, correlationId, {
      action: "auth.signed_out",
      outcome: "SUCCESS",
      resourceType: "session",
      resourceId: sessionId,
    });
  });
}

export function projectCapabilities(actor: ActorState): PermissionKey[] {
  return PERMISSION_KEYS.filter(
    (key) =>
      authorize(actor, key, orgResource(actor)).outcome === "ALLOW" ||
      actor.assignments.some(
        (grant) =>
          authorize(actor, key, {
            organisationId: actor.organisationId,
            clientId: grant.clientId,
            eventId: grant.eventId,
            departmentId: grant.departmentId,
            workstreamId: grant.workstreamId,
            eventClientId: grant.eventClientId,
          }).outcome === "ALLOW",
      ),
  );
}

export async function bump(
  db: Queryable,
  table: string,
  id: string,
  version: number,
): Promise<void> {
  const updated = await db.query(
    `UPDATE ${table} SET version = version + 1, updated_at = now() WHERE id = $1 AND version = $2`,
    [id, version],
  );
  if (!updated.rowCount)
    throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
}

export async function createClient(
  ctx: CommandContext,
  input: { code: string; displayName: string; legalName?: string | null; status: string },
): Promise<{ id: string }> {
  await requirePermission(
    ctx.actor,
    "client.create",
    orgResource(ctx.actor),
    ctx.correlationId,
    "client.created",
  );
  return withTx(async (db) => {
    const request = { op: "client.create", ...input };
    const prior = await replay<{ id: string }>(db, ctx, request);
    if (prior) return prior;
    const id = randomUUID();
    try {
      await db.query(
        `INSERT INTO clients (id, organisation_id, code, display_name, legal_name, status, synthetic)
         VALUES ($1,$2,$3,$4,$5,$6,true)`,
        [
          id,
          ctx.actor.organisationId,
          input.code,
          input.displayName,
          input.legalName ?? null,
          input.status,
        ],
      );
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        throw new AppError(
          "VALIDATION_FAILED",
          "That client code is already used in this organisation.",
          422,
        );
      }
      throw error;
    }
    const response = { id };
    await remember(db, ctx, request, response);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "client.created",
      outcome: "SUCCESS",
      resourceType: "client",
      resourceId: id,
      clientId: id,
      after: input,
    });
    return response;
  });
}

export async function updateClient(
  ctx: CommandContext,
  input: {
    id: string;
    version: number;
    displayName: string;
    legalName?: string | null;
    status: string;
  },
): Promise<{ id: string }> {
  return withTx(async (db) => {
    const current = await one<{
      id: string;
      organisation_id: string;
      version: number;
      status: string;
    }>(db, `SELECT id, organisation_id, version, status FROM clients WHERE id = $1`, [input.id]);
    if (!current || current.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    await requirePermission(
      ctx.actor,
      "client.update",
      { organisationId: current.organisation_id, clientId: current.id },
      ctx.correlationId,
      "client.updated",
    );
    if (current.status === "ARCHIVED")
      throw new AppError(
        "VALIDATION_FAILED",
        "Archived clients are read only until restored.",
        422,
      );
    if (current.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    await db.query(
      `UPDATE clients SET display_name = $2, legal_name = $3, status = $4 WHERE id = $1`,
      [input.id, input.displayName, input.legalName ?? null, input.status],
    );
    await bump(db, "clients", input.id, input.version);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "client.updated",
      outcome: "SUCCESS",
      resourceType: "client",
      resourceId: input.id,
      clientId: input.id,
      before: current,
      after: input,
    });
    return { id: input.id };
  });
}

export async function archiveClient(
  ctx: CommandContext,
  input: { id: string; version: number; reason: string },
): Promise<void> {
  await mutateStatus(ctx, "clients", "client.archive", "client.archived", input, "ARCHIVED");
}

export async function restoreClient(
  ctx: CommandContext,
  input: { id: string; version: number; reason: string },
): Promise<void> {
  await mutateStatus(ctx, "clients", "client.restore", "client.restored", input, "ACTIVE");
}

async function mutateStatus(
  ctx: CommandContext,
  table: "clients",
  permission: PermissionKey,
  action: string,
  input: { id: string; version: number; reason: string },
  status: string,
): Promise<void> {
  await withTx(async (db) => {
    const current = await one<{ id: string; organisation_id: string; version: number }>(
      db,
      `SELECT id, organisation_id, version FROM ${table} WHERE id = $1`,
      [input.id],
    );
    if (!current || current.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    await requirePermission(
      ctx.actor,
      permission,
      { organisationId: current.organisation_id, clientId: current.id },
      ctx.correlationId,
      action,
    );
    if (!input.reason.trim()) throw new AppError("VALIDATION_FAILED", "A reason is required.", 422);
    if (current.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    await db.query(`UPDATE ${table} SET status = $2 WHERE id = $1`, [input.id, status]);
    await bump(db, table, input.id, input.version);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action,
      outcome: "SUCCESS",
      resourceType: "client",
      resourceId: input.id,
      clientId: input.id,
      reason: input.reason,
      after: { status },
    });
  });
}

export async function listClients(
  actor: ActorState,
  filter: { query?: string; status?: string; includeArchived?: boolean },
): Promise<Record<string, unknown>[]> {
  return withTx(async (db) => {
    const decision = authorize(actor, "client.list", orgResource(actor));
    if (decision.outcome === "DENY") return [];
    const params: unknown[] = [actor.organisationId];
    let sql = `SELECT c.id, c.code, c.display_name, c.legal_name, c.status, c.version, c.updated_at,
      (SELECT count(*) FROM events e WHERE e.client_id = c.id AND e.status <> 'ARCHIVED') AS active_event_count
      FROM clients c WHERE c.organisation_id = $1`;
    if (!filter.includeArchived) sql += ` AND c.status <> 'ARCHIVED'`;
    if (filter.status) {
      params.push(filter.status);
      sql += ` AND c.status = $${params.length}`;
    }
    if (filter.query) {
      params.push(`%${filter.query}%`);
      sql += ` AND (c.display_name ILIKE $${params.length} OR c.code ILIKE $${params.length})`;
    }
    const result = await rows<Record<string, unknown>>(db, sql, params);
    return result.filter(
      (client) =>
        authorize(actor, "client.view", {
          organisationId: actor.organisationId,
          clientId: String(client.id),
        }).outcome === "ALLOW",
    );
  });
}

export async function getClient(actor: ActorState, id: string): Promise<Record<string, unknown>> {
  return withTx(async (db) => {
    const client = await one<Record<string, unknown>>(
      db,
      `SELECT * FROM clients WHERE id = $1 AND organisation_id = $2`,
      [id, actor.organisationId],
    );
    if (!client) throw new AppError("NOT_FOUND", "Not found.", 404);
    if (
      authorize(actor, "client.view", { organisationId: actor.organisationId, clientId: id })
        .outcome === "DENY"
    ) {
      throw new AppError("NOT_FOUND", "Not found.", 404);
    }
    return client;
  });
}

export async function createEvent(
  ctx: CommandContext,
  input: {
    clientId: string;
    programmeId?: string | null;
    code: string;
    name: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    venueSummary?: string | null;
    status: "DRAFT" | "ACTIVE";
  },
): Promise<{ id: string }> {
  return withTx(async (db) => {
    const client = await one<{ id: string; organisation_id: string }>(
      db,
      `SELECT id, organisation_id FROM clients WHERE id = $1`,
      [input.clientId],
    );
    if (!client || client.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    await requirePermission(
      ctx.actor,
      "event.create",
      { organisationId: client.organisation_id, clientId: client.id },
      ctx.correlationId,
      "event.created",
    );
    const request = { op: "event.create", ...input };
    const prior = await replay<{ id: string }>(db, ctx, request);
    if (prior) return prior;
    if (new Date(input.endsAt) < new Date(input.startsAt))
      throw new AppError("VALIDATION_FAILED", "The event must end after it starts.", 422);
    try {
      Intl.DateTimeFormat("en-GB", { timeZone: input.timezone }).format(new Date());
    } catch {
      throw new AppError("VALIDATION_FAILED", "Choose a valid timezone.", 422);
    }
    const id = randomUUID();
    const mefId = randomUUID();
    try {
      await db.query(
        `INSERT INTO events (id, organisation_id, client_id, programme_id, code, name, starts_at, ends_at, timezone, venue_summary, phase, status, synthetic)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'DISCOVER',$11,true)`,
        [
          id,
          ctx.actor.organisationId,
          input.clientId,
          input.programmeId ?? null,
          input.code,
          input.name,
          input.startsAt,
          input.endsAt,
          input.timezone,
          input.venueSummary ?? null,
          input.status,
        ],
      );
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        throw new AppError(
          "VALIDATION_FAILED",
          "That event code is already used for this client.",
          422,
        );
      }
      throw error;
    }
    await db.query(
      `INSERT INTO master_event_files (id, organisation_id, client_id, event_id) VALUES ($1,$2,$3,$4)`,
      [mefId, ctx.actor.organisationId, input.clientId, id],
    );
    for (const slot of MEF_SLOTS) {
      await db.query(
        `INSERT INTO mef_slots (id, organisation_id, master_event_file_id, slot_key, status, verification_state) VALUES ($1,$2,$3,$4,'NOT_COMPOSED','UNVERIFIED')`,
        [randomUUID(), ctx.actor.organisationId, mefId, slot],
      );
    }
    await db.query(
      `INSERT INTO event_phase_history (id, organisation_id, event_id, from_phase, to_phase, reason, changed_by_user_id)
       VALUES ($1,$2,$3,NULL,'DISCOVER','Event created',$4)`,
      [randomUUID(), ctx.actor.organisationId, id, ctx.actor.userId],
    );
    const response = { id };
    await remember(db, ctx, request, response);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "event.created",
      outcome: "SUCCESS",
      resourceType: "event",
      resourceId: id,
      clientId: input.clientId,
      eventId: id,
      after: input,
    });
    return response;
  });
}

export async function updateEvent(
  ctx: CommandContext,
  input: {
    id: string;
    version: number;
    name: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    venueSummary?: string | null;
  },
): Promise<void> {
  await withTx(async (db) => {
    const event = await one<{
      id: string;
      organisation_id: string;
      client_id: string;
      version: number;
      status: string;
    }>(db, `SELECT id, organisation_id, client_id, version, status FROM events WHERE id = $1`, [
      input.id,
    ]);
    if (!event || event.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    const scope = {
      organisationId: event.organisation_id,
      clientId: event.client_id,
      eventId: event.id,
      eventClientId: event.client_id,
    };
    if (authorize(ctx.actor, "event.update", scope).outcome === "DENY")
      throw new AppError("NOT_FOUND", "Not found.", 404);
    if (event.status === "ARCHIVED")
      throw new AppError("VALIDATION_FAILED", "Archived events are read only until restored.", 422);
    if (event.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    if (new Date(input.endsAt) < new Date(input.startsAt))
      throw new AppError("VALIDATION_FAILED", "The event must end after it starts.", 422);
    await db.query(
      `UPDATE events SET name=$2, starts_at=$3, ends_at=$4, timezone=$5, venue_summary=$6 WHERE id=$1`,
      [
        input.id,
        input.name,
        input.startsAt,
        input.endsAt,
        input.timezone,
        input.venueSummary ?? null,
      ],
    );
    await bump(db, "events", input.id, input.version);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "event.updated",
      outcome: "SUCCESS",
      resourceType: "event",
      resourceId: input.id,
      clientId: event.client_id,
      eventId: input.id,
      before: event,
      after: input,
    });
  });
}

export async function transitionEvent(
  ctx: CommandContext,
  input: { id: string; version: number; to: string; reason?: string | null },
): Promise<void> {
  await withTx(async (db) => {
    const request = { op: "event.transition", ...input };
    const prior = await replay<null>(db, ctx, request);
    if (prior !== undefined) return;
    const event = await one<{
      id: string;
      organisation_id: string;
      client_id: string;
      phase: string;
      status: string;
      version: number;
    }>(
      db,
      `SELECT id, organisation_id, client_id, phase, status, version FROM events WHERE id = $1`,
      [input.id],
    );
    if (!event || event.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    const scope = {
      organisationId: event.organisation_id,
      clientId: event.client_id,
      eventId: event.id,
      eventClientId: event.client_id,
    };
    if (authorize(ctx.actor, "event.phase.transition", scope).outcome === "DENY") {
      await writeAudit(db, ctx.actor, ctx.correlationId, {
        action: "event.phase_transition",
        outcome: "DENIED",
        resourceType: "event",
        resourceId: input.id,
        eventId: input.id,
        reason: "NO_GRANT",
      });
      throw new AppError("NOT_FOUND", "Not found.", 404);
    }
    const allowed = PHASE_EDGES[event.phase] ?? [];
    if (!allowed.includes(input.to)) {
      await writeAudit(db, ctx.actor, ctx.correlationId, {
        action: "event.phase_transition",
        outcome: "DENIED",
        resourceType: "event",
        resourceId: input.id,
        eventId: input.id,
        reason: "TRANSITION_INVALID",
      });
      throw new AppError("TRANSITION_INVALID", "That phase change is not allowed.", 409);
    }
    if (S01_DISABLED_TARGETS.has(input.to)) {
      await writeAudit(db, ctx.actor, ctx.correlationId, {
        action: "event.phase_transition",
        outcome: "DENIED",
        resourceType: "event",
        resourceId: input.id,
        eventId: input.id,
        reason: "CAPABILITY_NOT_ENABLED",
      });
      throw new AppError("CAPABILITY_NOT_ENABLED", "This capability is not yet enabled.", 409);
    }
    const reversal =
      ["DISCOVER", "DESIGN", "PREPARE"].includes(input.to) && input.to !== nextForward(event.phase);
    if (
      (reversal || input.to === "CANCELLED" || input.to === "ARCHIVED") &&
      !input.reason?.trim()
    ) {
      throw new AppError("VALIDATION_FAILED", "A reason is required for this change.", 422);
    }
    const planner = ctx.actor.assignments.some(
      (grant) => grant.roleKey === "PLANNER" && grant.eventId === event.id,
    );
    const director =
      ctx.actor.assignments.some(
        (grant) => grant.roleKey === "EVENT_DIRECTOR" && grant.eventId === event.id,
      ) || isOrgWideCeo(ctx.actor);
    if (planner && !director && !plannerMayTransition(event.phase, input.to)) {
      await writeAudit(db, ctx.actor, ctx.correlationId, {
        action: "event.phase_transition",
        outcome: "DENIED",
        resourceType: "event",
        resourceId: input.id,
        reason: "PLANNER_LIMIT",
      });
      throw new AppError("FORBIDDEN", "A planner cannot make that phase change.", 403);
    }
    if (event.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    if (input.to === "CANCELLED") {
      await db.query(`UPDATE events SET status = 'CANCELLED' WHERE id = $1`, [input.id]);
    } else if (input.to === "ARCHIVED") {
      throw new AppError(
        "FORBIDDEN",
        "Archiving is a reserved decision. Submit it for approval.",
        403,
      );
    } else {
      await db.query(`UPDATE events SET phase = $2 WHERE id = $1`, [input.id, input.to]);
    }
    await bump(db, "events", input.id, input.version);
    await db.query(
      `INSERT INTO event_phase_history (id, organisation_id, event_id, from_phase, to_phase, reason, changed_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        randomUUID(),
        event.organisation_id,
        event.id,
        event.phase,
        input.to,
        input.reason ?? null,
        ctx.actor.userId,
      ],
    );
    await remember(db, ctx, request, null);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "event.phase_transition",
      outcome: "SUCCESS",
      resourceType: "event",
      resourceId: input.id,
      clientId: event.client_id,
      eventId: input.id,
      reason: input.reason,
      before: { phase: event.phase },
      after: { to: input.to },
    });
  });
}

function nextForward(phase: string): string {
  if (phase === "DISCOVER") return "DESIGN";
  if (phase === "DESIGN") return "PREPARE";
  if (phase === "CLOSE") return "LEARN";
  return "";
}

export async function listEvents(
  actor: ActorState,
  filter: { query?: string; phase?: string; clientId?: string; includeArchived?: boolean },
): Promise<Record<string, unknown>[]> {
  return withTx(async (db) => {
    const params: unknown[] = [actor.organisationId];
    let sql = `SELECT e.id, e.client_id, e.code, e.name, e.phase, e.status, e.starts_at, e.ends_at, e.timezone, e.version, c.display_name AS client_name
      FROM events e JOIN clients c ON c.id = e.client_id WHERE e.organisation_id = $1`;
    if (!filter.includeArchived) sql += ` AND e.status <> 'ARCHIVED'`;
    if (filter.phase) {
      params.push(filter.phase);
      sql += ` AND e.phase = $${params.length}`;
    }
    if (filter.clientId) {
      params.push(filter.clientId);
      sql += ` AND e.client_id = $${params.length}`;
    }
    if (filter.query) {
      params.push(`%${filter.query}%`);
      sql += ` AND (e.name ILIKE $${params.length} OR e.code ILIKE $${params.length})`;
    }
    const result = await rows<Record<string, unknown>>(db, sql, params);
    return result.filter(
      (event) =>
        authorize(actor, "event.view", {
          organisationId: actor.organisationId,
          clientId: String(event.client_id),
          eventId: String(event.id),
          eventClientId: String(event.client_id),
        }).outcome === "ALLOW",
    );
  });
}

export async function getEvent(actor: ActorState, id: string): Promise<Record<string, unknown>> {
  return withTx(async (db) => {
    const event = await one<Record<string, unknown>>(
      db,
      `SELECT e.*, c.display_name AS client_name FROM events e JOIN clients c ON c.id = e.client_id WHERE e.id = $1 AND e.organisation_id = $2`,
      [id, actor.organisationId],
    );
    if (!event) throw new AppError("NOT_FOUND", "Not found.", 404);
    if (
      authorize(actor, "event.view", {
        organisationId: actor.organisationId,
        clientId: String(event.client_id),
        eventId: id,
        eventClientId: String(event.client_id),
      }).outcome === "DENY"
    ) {
      throw new AppError("NOT_FOUND", "Not found.", 404);
    }
    return event;
  });
}

export async function phaseHistory(
  actor: ActorState,
  eventId: string,
): Promise<Record<string, unknown>[]> {
  const event = await getEvent(actor, eventId);
  return withTx((db) =>
    rows(
      db,
      `SELECT h.*, u.display_name FROM event_phase_history h JOIN users u ON u.id = h.changed_by_user_id WHERE h.event_id = $1 ORDER BY h.changed_at`,
      [event.id],
    ),
  );
}

export async function getMef(
  actor: ActorState,
  eventId: string,
): Promise<{ file: Record<string, unknown>; slots: Record<string, unknown>[] }> {
  const event = await getEvent(actor, eventId);
  if (
    authorize(actor, "mef.view", {
      organisationId: actor.organisationId,
      eventId,
      clientId: String(event.client_id),
      eventClientId: String(event.client_id),
    }).outcome === "DENY"
  ) {
    throw new AppError("NOT_FOUND", "Not found.", 404);
  }
  return withTx(async (db) => {
    const file = await one<Record<string, unknown>>(
      db,
      `SELECT * FROM master_event_files WHERE event_id = $1`,
      [eventId],
    );
    if (!file) throw new AppError("NOT_FOUND", "Not found.", 404);
    const slots = await rows<Record<string, unknown>>(
      db,
      `SELECT * FROM mef_slots WHERE master_event_file_id = $1 ORDER BY slot_key`,
      [file.id],
    );
    return { file, slots };
  });
}

export async function updateMefSlot(
  ctx: CommandContext,
  input: { eventId: string; slotKey: string; version: number; status: string; note: string },
): Promise<void> {
  await withTx(async (db) => {
    const event = await one<{ client_id: string; organisation_id: string }>(
      db,
      `SELECT client_id, organisation_id FROM events WHERE id = $1`,
      [input.eventId],
    );
    if (!event || event.organisation_id !== ctx.actor.organisationId)
      throw new AppError("NOT_FOUND", "Not found.", 404);
    const scope = {
      organisationId: event.organisation_id,
      clientId: event.client_id,
      eventId: input.eventId,
      eventClientId: event.client_id,
    };
    if (authorize(ctx.actor, "mef.update", scope).outcome === "DENY")
      throw new AppError("NOT_FOUND", "Not found.", 404);
    if (!(MEF_SLOTS as readonly string[]).includes(input.slotKey))
      throw new AppError("VALIDATION_FAILED", "Unknown composition slot.", 422);
    const slot = await one<{ id: string; version: number }>(
      db,
      `SELECT s.id, s.version FROM mef_slots s JOIN master_event_files m ON m.id = s.master_event_file_id WHERE m.event_id = $1 AND s.slot_key = $2`,
      [input.eventId, input.slotKey],
    );
    if (!slot || slot.version !== input.version)
      throw new AppError("VERSION_CONFLICT", "This record changed. Reload it and try again.", 409);
    await db.query(
      `UPDATE mef_slots SET status = $2, note = $3, verification_state = 'HUMAN_VERIFIED', updated_by_user_id = $4 WHERE id = $1`,
      [slot.id, input.status, input.note, ctx.actor.userId],
    );
    await bump(db, "mef_slots", slot.id, input.version);
    await writeAudit(db, ctx.actor, ctx.correlationId, {
      action: "mef.slot_updated",
      outcome: "SUCCESS",
      resourceType: "mef_slot",
      resourceId: slot.id,
      eventId: input.eventId,
      clientId: event.client_id,
      after: input,
    });
  });
}

export async function listFixtureUsers(): Promise<
  Array<{ id: string; display_name: string; email: string; status: string }>
> {
  return withTx((db) =>
    rows(
      db,
      `SELECT id, display_name, email, status FROM users WHERE synthetic = true ORDER BY display_name`,
    ),
  );
}

export { PERMISSION_REGISTRY };
