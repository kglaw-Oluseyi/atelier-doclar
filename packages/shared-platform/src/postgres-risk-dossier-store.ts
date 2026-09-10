import { PlatformError } from "./errors.js";
import type { PgQueryable, PgTransactor } from "./postgres-schema.js";
import { PostgresRiskTransaction } from "./postgres-risk-store.js";
import { mapCurrentnessConflict, type RiskDossierClientMessage } from "./risk-dossier-decisions.js";
import { workspaceFromTransaction } from "./risk-dossier-repository.js";
import type { RiskDossierLock, RiskDossierRepository, RiskDossierTransaction, RiskDossierWorkspace } from "./risk-dossier-repository.js";
import type { RiskProjectionAudience } from "./risk-disclosure.js";
import type { RiskSafePatch, RiskScope } from "./risk-repository.js";
import type {
  RiskApplicabilitySnapshot,
  RiskDossierAccessGrant,
  RiskDossierEdition,
  RiskDossierExport,
  RiskDossierPublication,
  RiskIdempotencyReceipt,
} from "./risk-schemas.js";
import type { AuditEvent } from "./schemas.js";

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

function asBody<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function scoped<T extends { organisationId?: string; eventId?: string }>(item: T | undefined, scope: RiskScope): T | undefined {
  if (!item) return undefined;
  if (item.organisationId && item.organisationId !== scope.organisationId) return undefined;
  if (scope.eventId && item.eventId && item.eventId !== scope.eventId) return undefined;
  return item;
}

export class PostgresRiskDossierTransaction implements RiskDossierTransaction {
  readonly queries: string[] = [];
  private readonly writes: PostgresRiskTransaction;

  constructor(private readonly client: PgQueryable) {
    this.writes = new PostgresRiskTransaction(client);
  }

  recordedQueries(): string[] {
    return this.queries.slice();
  }

  private async one<T>(sql: string, values: unknown[], scope?: RiskScope): Promise<T | undefined> {
    this.queries.push(sql);
    const result = await this.client.query<{ body: unknown; count?: number }>(sql, values);
    if (sql.startsWith("SELECT COUNT")) {
      return Number(result.rows[0]?.count ?? 0) as T;
    }
    const body = result.rows[0]?.body;
    if (body == null) return undefined;
    const parsed = asBody<T>(body);
    return scope ? scoped(parsed as T & { organisationId?: string; eventId?: string }, scope) : parsed;
  }

  private async many<T>(sql: string, values: unknown[], scope: RiskScope): Promise<T[]> {
    this.queries.push(sql);
    const result = await this.client.query<{ body: unknown }>(sql, values);
    return result.rows
      .map((row) => asBody<T>(row.body))
      .filter((item) => scoped(item as T & { organisationId?: string; eventId?: string }, scope));
  }

  async loadEdition(id: string, scope: RiskScope, lock?: RiskDossierLock) {
    return this.one<RiskDossierEdition>(
      `SELECT body FROM risk_dossier_editions WHERE id = $1 AND organisation_id = $2${lock ? " FOR UPDATE" : ""}`,
      [id, scope.organisationId],
      scope,
    );
  }

  async loadCurrentWorking(scope: Required<RiskScope>, lock?: RiskDossierLock) {
    const rows = await this.many<RiskDossierEdition>(
      `SELECT body FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2 AND current IS TRUE${lock ? " FOR UPDATE" : ""}`,
      [scope.organisationId, scope.eventId],
      scope,
    );
    return rows.find((item) => item.status === "DRAFT" || item.status === "SUBMITTED" || item.status === "APPROVED");
  }

  async loadAnyCurrentEdition(scope: Required<RiskScope>, lock?: RiskDossierLock) {
    const rows = await this.many<RiskDossierEdition>(
      `SELECT body FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2 AND current IS TRUE${lock ? " FOR UPDATE" : ""}`,
      [scope.organisationId, scope.eventId],
      scope,
    );
    return rows[0];
  }

  async loadCurrentPublication(scope: Required<RiskScope>, lock?: RiskDossierLock) {
    const rows = await this.many<RiskDossierPublication>(
      `SELECT body FROM risk_dossier_publications WHERE organisation_id = $1 AND event_id = $2 AND current IS TRUE${lock ? " FOR UPDATE" : ""}`,
      [scope.organisationId, scope.eventId],
      scope,
    );
    return rows.find((item) => item.status === "CURRENT" || item.current) ?? rows[0];
  }

  async loadPublicationEdition(scope: Required<RiskScope>) {
    const publication = await this.loadCurrentPublication(scope);
    const editionId = publication?.editionId ?? publication?.dossierId;
    const edition = editionId ? await this.loadEdition(editionId, scope) : undefined;
    return publication && edition ? { publication, edition } : undefined;
  }

  async loadApplicabilitySnapshot(idOrHash: { eventId: string; id?: string; contentHash?: string }, scope: RiskScope) {
    if (idOrHash.id) {
      return this.one<RiskApplicabilitySnapshot>(
        "SELECT body FROM risk_applicability_snapshots WHERE organisation_id = $1 AND event_id = $2 AND id = $3",
        [scope.organisationId, idOrHash.eventId, idOrHash.id],
        scope,
      );
    }
    if (idOrHash.contentHash) {
      return this.one<RiskApplicabilitySnapshot>(
        "SELECT body FROM risk_applicability_snapshots WHERE organisation_id = $1 AND event_id = $2 AND content_hash = $3",
        [scope.organisationId, idOrHash.eventId, idOrHash.contentHash],
        scope,
      );
    }
    return this.one<RiskApplicabilitySnapshot>(
      "SELECT body FROM risk_applicability_snapshots WHERE organisation_id = $1 AND event_id = $2 ORDER BY created_at DESC LIMIT 1",
      [scope.organisationId, idOrHash.eventId],
      scope,
    );
  }

  async loadRuleMandatory(id: string, scope: RiskScope) {
    const row = await this.one<{ mandatory?: boolean }>(
      "SELECT body FROM risk_rule_editions WHERE id = $1 AND organisation_id = $2",
      [id, scope.organisationId],
      scope,
    );
    return row ? Boolean(row.mandatory) : undefined;
  }

  async countEventEditions(scope: Required<RiskScope>) {
    this.queries.push("SELECT COUNT(*)::int AS count FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2");
    const result = await this.client.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2",
      [scope.organisationId, scope.eventId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async countEventPublications(scope: Required<RiskScope>) {
    this.queries.push("SELECT COUNT(*)::int AS count FROM risk_dossier_publications WHERE organisation_id = $1 AND event_id = $2");
    const result = await this.client.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM risk_dossier_publications WHERE organisation_id = $1 AND event_id = $2",
      [scope.organisationId, scope.eventId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async listEventEditions(scope: Required<RiskScope>, options?: { limit?: number }) {
    return this.many<RiskDossierEdition>(
      "SELECT body FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2 ORDER BY updated_at DESC LIMIT $3",
      [scope.organisationId, scope.eventId, options?.limit ?? 20],
      scope,
    );
  }

  async listEventPublications(scope: Required<RiskScope>, options?: { limit?: number }) {
    return this.many<RiskDossierPublication>(
      "SELECT body FROM risk_dossier_publications WHERE organisation_id = $1 AND event_id = $2 ORDER BY updated_at DESC LIMIT $3",
      [scope.organisationId, scope.eventId, options?.limit ?? 20],
      scope,
    );
  }

  async loadGrant(id: string, scope: RiskScope, lock?: RiskDossierLock) {
    return this.one<RiskDossierAccessGrant>(
      `SELECT body FROM risk_dossier_access_grants WHERE id = $1 AND organisation_id = $2${lock ? " FOR UPDATE" : ""}`,
      [id, scope.organisationId],
      scope,
    );
  }

  async findGrantByTokenHash(tokenHash: string) {
    return this.one<RiskDossierAccessGrant>(
      "SELECT body FROM risk_dossier_access_grants WHERE body->>'tokenHash' = $1 LIMIT 1",
      [tokenHash],
    );
  }

  async findActiveGrant(scope: Required<RiskScope>, lock?: RiskDossierLock) {
    return this.one<RiskDossierAccessGrant>(
      `SELECT body FROM risk_dossier_access_grants WHERE organisation_id = $1 AND event_id = $2 AND status = 'ACTIVE'${lock ? " FOR UPDATE" : ""}`,
      [scope.organisationId, scope.eventId],
      scope,
    );
  }

  async listEventGrants(scope: Required<RiskScope>, options?: { limit?: number }) {
    return this.many<RiskDossierAccessGrant>(
      "SELECT body FROM risk_dossier_access_grants WHERE organisation_id = $1 AND event_id = $2 ORDER BY updated_at DESC LIMIT $3",
      [scope.organisationId, scope.eventId, options?.limit ?? 20],
      scope,
    );
  }

  async loadEventIdentity(scope: Required<RiskScope>) {
    this.queries.push("SELECT body FROM platform_documents WHERE collection = $1 AND id = $2");
    const result = await this.client.query<{ body: unknown }>(
      "SELECT body FROM platform_documents WHERE collection = $1 AND id = $2",
      ["events", scope.eventId],
    );
    const event = result.rows[0] ? asBody<{ id: string; organisationId: string; name: string }>(result.rows[0].body) : undefined;
    if (!event || event.organisationId !== scope.organisationId) return undefined;
    return { id: event.id, organisationId: event.organisationId, name: event.name };
  }

  async loadAssignment(id: string, scope: RiskScope) {
    this.queries.push("SELECT body FROM platform_documents WHERE collection = $1 AND id = $2");
    const result = await this.client.query<{ body: unknown }>(
      "SELECT body FROM platform_documents WHERE collection = $1 AND id = $2",
      ["assignments", id],
    );
    const assignment = result.rows[0]
      ? asBody<{ id: string; personId: string; organisationId: string; eventId?: string; status: string }>(result.rows[0].body)
      : undefined;
    if (!assignment || assignment.organisationId !== scope.organisationId) return undefined;
    return assignment;
  }

  async insertEdition(record: RiskDossierEdition) {
    this.queries.push("INSERT INTO risk_dossier_editions");
    try {
      await this.writes.insertImmutable("riskDossierEditions", record);
    } catch (error) {
      mapCurrentnessConflict(error);
    }
  }

  async updateEdition(id: string, expectedVersion: number, patch: RiskSafePatch) {
    this.queries.push("UPDATE risk_dossier_editions SET body WHERE id = $1 AND version = $2");
    await this.writes.updateVersioned("riskDossierEditions", id, expectedVersion, patch);
  }

  async insertPublication(record: RiskDossierPublication) {
    this.queries.push("INSERT INTO risk_dossier_publications");
    try {
      await this.writes.insertImmutable("riskDossierPublications", record);
    } catch (error) {
      mapCurrentnessConflict(error);
    }
  }

  async updatePublication(id: string, expectedVersion: number, patch: RiskSafePatch) {
    this.queries.push("UPDATE risk_dossier_publications SET body WHERE id = $1 AND version = $2");
    await this.writes.updateVersioned("riskDossierPublications", id, expectedVersion, patch);
  }

  async insertGrant(record: RiskDossierAccessGrant) {
    this.queries.push("INSERT INTO risk_dossier_access_grants");
    await this.writes.insertImmutable("riskDossierAccessGrants", record);
  }

  async updateGrant(id: string, expectedVersion: number, patch: RiskSafePatch) {
    this.queries.push("UPDATE risk_dossier_access_grants SET body WHERE id = $1 AND version = $2");
    await this.writes.updateVersioned("riskDossierAccessGrants", id, expectedVersion, patch);
  }

  async insertClientMessage(record: RiskDossierClientMessage) {
    this.queries.push("UPDATE risk_dossier_publications SET body WHERE id = $1");
    const publication = await this.one<RiskDossierPublication>(
      "SELECT body FROM risk_dossier_publications WHERE id = $1 FOR UPDATE",
      [record.publicationId],
    );
    if (!publication) throw new PlatformError("NOT_FOUND", "no published client dossier is available");
    publication.clientMessages = [
      ...(publication.clientMessages ?? []),
      {
        id: record.id,
        kind: record.kind,
        body: record.body,
        createdByPersonId: record.createdByPersonId,
        createdAt: record.createdAt,
      },
    ];
    await this.updatePublication(publication.id, publication.version, publication);
  }

  async insertExport(record: RiskDossierExport) {
    this.queries.push("INSERT INTO risk_dossier_exports");
    await this.writes.insertImmutable("riskDossierExports", record);
  }

  async appendAudit(record: AuditEvent) {
    this.queries.push("INSERT INTO platform_audit");
    await this.writes.appendAudit(record);
  }

  async getIdempotency(scope: RiskScope, action: string, key: string) {
    return this.writes.getIdempotency(scope, action, key);
  }

  async insertIdempotency(receipt: RiskIdempotencyReceipt) {
    this.queries.push("INSERT INTO platform_idempotency");
    this.queries.push("INSERT INTO risk_idempotency_receipts");
    await this.client.query(
      "INSERT INTO platform_idempotency (key, action, hash, result_ref, created_at, body) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
      [
        receipt.idempotencyKey,
        receipt.action,
        receipt.hash,
        receipt.resultRef,
        receipt.createdAt,
        JSON.stringify({
          key: receipt.idempotencyKey,
          action: receipt.action,
          hash: receipt.hash,
          resultRef: receipt.resultRef,
          createdAt: receipt.createdAt,
        }),
      ],
    );
    return this.writes.insertIdempotency(receipt);
  }
}

export class PostgresRiskDossierRepository implements RiskDossierRepository {
  constructor(private readonly client: PgQueryable) {}

  async transaction<T>(work: (tx: RiskDossierTransaction) => Promise<T>): Promise<T> {
    const run = async (queryable: PgQueryable) => work(new PostgresRiskDossierTransaction(queryable));
    if (hasTransaction(this.client)) return this.client.transaction(run);
    return run(this.client);
  }

  async getWorkspace(input: {
    organisationId: string;
    eventId: string;
    actorProjection: RiskProjectionAudience;
  }): Promise<RiskDossierWorkspace> {
    void input.actorProjection;
    return this.transaction(async (tx) => workspaceFromTransaction(tx, input));
  }
}
