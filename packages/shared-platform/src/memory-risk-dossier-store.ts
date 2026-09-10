import { PlatformError } from "./errors.js";
import {
  isCurrentPublication,
  isWorkingDossier,
  type RiskDossierClientMessage,
} from "./risk-dossier-decisions.js";
import { workspaceFromTransaction, type RiskDossierRepository, type RiskDossierTransaction, type RiskDossierWorkspace } from "./risk-dossier-repository.js";
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
import type { PlatformSnapshot, PlatformStore } from "./store.js";

function scoped<T extends { organisationId?: string; eventId?: string }>(item: T, scope: RiskScope): boolean {
  if (item.organisationId && item.organisationId !== scope.organisationId) return false;
  if (scope.eventId && item.eventId && item.eventId !== scope.eventId) return false;
  return true;
}

export class MemoryRiskDossierTransaction implements RiskDossierTransaction {
  readonly queries: string[] = [];

  constructor(private readonly snap: PlatformSnapshot) {}

  recordedQueries(): string[] {
    return this.queries.slice();
  }

  private note(sql: string): void {
    this.queries.push(sql);
  }

  async loadEdition(id: string, scope: RiskScope): Promise<RiskDossierEdition | undefined> {
    this.note("SELECT body FROM risk_dossier_editions WHERE id = $1 AND organisation_id = $2");
    const row = this.snap.riskDossierEditions.find((item) => item.id === id);
    return row && scoped(row, scope) ? row : undefined;
  }

  async loadCurrentWorking(scope: Required<RiskScope>): Promise<RiskDossierEdition | undefined> {
    this.note("SELECT body FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2 AND current IS TRUE");
    return [...this.snap.riskDossierEditions].reverse().find((item) => item.eventId === scope.eventId && scoped(item, scope) && isWorkingDossier(item));
  }

  async loadAnyCurrentEdition(scope: Required<RiskScope>): Promise<RiskDossierEdition | undefined> {
    this.note("SELECT body FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2 AND current IS TRUE");
    return [...this.snap.riskDossierEditions].reverse().find((item) => item.eventId === scope.eventId && scoped(item, scope) && item.current);
  }

  async loadCurrentPublication(scope: Required<RiskScope>): Promise<RiskDossierPublication | undefined> {
    this.note("SELECT body FROM risk_dossier_publications WHERE organisation_id = $1 AND event_id = $2 AND current IS TRUE");
    return [...this.snap.riskDossierPublications].reverse().find((item) => item.eventId === scope.eventId && scoped(item, scope) && isCurrentPublication(item));
  }

  async loadPublicationEdition(scope: Required<RiskScope>) {
    const publication = await this.loadCurrentPublication(scope);
    const editionId = publication?.editionId ?? publication?.dossierId;
    const edition = editionId ? await this.loadEdition(editionId, scope) : undefined;
    return publication && edition ? { publication, edition } : undefined;
  }

  async loadApplicabilitySnapshot(
    idOrHash: { eventId: string; id?: string; contentHash?: string },
    scope: RiskScope,
  ): Promise<RiskApplicabilitySnapshot | undefined> {
    if (idOrHash.id) {
      this.note("SELECT body FROM risk_applicability_snapshots WHERE organisation_id = $1 AND event_id = $2 AND id = $3");
    } else if (idOrHash.contentHash) {
      this.note("SELECT body FROM risk_applicability_snapshots WHERE organisation_id = $1 AND event_id = $2 AND content_hash = $3");
    } else {
      this.note("SELECT body FROM risk_applicability_snapshots WHERE organisation_id = $1 AND event_id = $2 ORDER BY created_at DESC LIMIT 1");
    }
    const rows = this.snap.riskApplicabilitySnapshots.filter((item) => item.eventId === idOrHash.eventId && scoped(item, scope));
    if (idOrHash.id) return rows.find((item) => item.id === idOrHash.id);
    if (idOrHash.contentHash) return rows.find((item) => item.contentHash === idOrHash.contentHash);
    return [...rows].reverse()[0];
  }

  async loadRuleMandatory(id: string, scope: RiskScope): Promise<boolean | undefined> {
    this.note("SELECT body FROM risk_rule_editions WHERE id = $1 AND organisation_id = $2");
    const row = this.snap.riskRuleEditions.find((item) => item.id === id);
    if (!row || !scoped(row, scope)) return undefined;
    return Boolean(row.mandatory);
  }

  async countEventEditions(scope: Required<RiskScope>): Promise<number> {
    this.note("SELECT COUNT(*) FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2");
    return this.snap.riskDossierEditions.filter((item) => item.eventId === scope.eventId && scoped(item, scope)).length;
  }

  async countEventPublications(scope: Required<RiskScope>): Promise<number> {
    this.note("SELECT COUNT(*) FROM risk_dossier_publications WHERE organisation_id = $1 AND event_id = $2");
    return this.snap.riskDossierPublications.filter((item) => item.eventId === scope.eventId && scoped(item, scope)).length;
  }

  async listEventEditions(scope: Required<RiskScope>, options?: { limit?: number }): Promise<RiskDossierEdition[]> {
    this.note("SELECT body FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2 ORDER BY updated_at DESC LIMIT $3");
    return this.snap.riskDossierEditions
      .filter((item) => item.eventId === scope.eventId && scoped(item, scope))
      .slice()
      .reverse()
      .slice(0, options?.limit ?? 20);
  }

  async listEventPublications(scope: Required<RiskScope>, options?: { limit?: number }): Promise<RiskDossierPublication[]> {
    this.note("SELECT body FROM risk_dossier_publications WHERE organisation_id = $1 AND event_id = $2 ORDER BY updated_at DESC LIMIT $3");
    return this.snap.riskDossierPublications
      .filter((item) => item.eventId === scope.eventId && scoped(item, scope))
      .slice()
      .reverse()
      .slice(0, options?.limit ?? 20);
  }

  async loadGrant(id: string, scope: RiskScope): Promise<RiskDossierAccessGrant | undefined> {
    this.note("SELECT body FROM risk_dossier_access_grants WHERE id = $1 AND organisation_id = $2");
    const row = (this.snap.riskDossierAccessGrants ?? []).find((item) => item.id === id);
    return row && scoped(row, scope) ? row : undefined;
  }

  async findGrantByTokenHash(tokenHash: string): Promise<RiskDossierAccessGrant | undefined> {
    this.note("SELECT body FROM risk_dossier_access_grants WHERE body->>'tokenHash' = $1 LIMIT 1");
    return (this.snap.riskDossierAccessGrants ?? []).find((item) => item.tokenHash === tokenHash);
  }

  async findActiveGrant(scope: Required<RiskScope>): Promise<RiskDossierAccessGrant | undefined> {
    this.note("SELECT body FROM risk_dossier_access_grants WHERE organisation_id = $1 AND event_id = $2 AND status = 'ACTIVE'");
    return (this.snap.riskDossierAccessGrants ?? []).find((item) => item.eventId === scope.eventId && scoped(item, scope) && item.status === "ACTIVE");
  }

  async listEventGrants(scope: Required<RiskScope>, options?: { limit?: number }): Promise<RiskDossierAccessGrant[]> {
    this.note("SELECT body FROM risk_dossier_access_grants WHERE organisation_id = $1 AND event_id = $2 ORDER BY updated_at DESC LIMIT $3");
    return (this.snap.riskDossierAccessGrants ?? [])
      .filter((item) => item.eventId === scope.eventId && scoped(item, scope))
      .slice()
      .reverse()
      .slice(0, options?.limit ?? 20);
  }

  async loadEventIdentity(scope: Required<RiskScope>) {
    this.note("SELECT body FROM platform_documents WHERE collection = 'events' AND id = $1");
    const event = this.snap.events.find((item) => item.id === scope.eventId && item.organisationId === scope.organisationId);
    return event ? { id: event.id, organisationId: event.organisationId, name: event.name } : undefined;
  }

  async loadAssignment(id: string, scope: RiskScope) {
    this.note("SELECT body FROM platform_documents WHERE collection = 'assignments' AND id = $1");
    const assignment = this.snap.assignments.find((item) => item.id === id);
    if (!assignment || assignment.organisationId !== scope.organisationId) return undefined;
    return assignment;
  }

  async insertEdition(record: RiskDossierEdition): Promise<void> {
    this.note("INSERT INTO risk_dossier_editions");
    this.snap.riskDossierEditions.push(record);
  }

  async updateEdition(id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void> {
    this.note("UPDATE risk_dossier_editions SET body WHERE id = $1 AND version = $2");
    const index = this.snap.riskDossierEditions.findIndex((item) => item.id === id);
    if (index < 0 || this.snap.riskDossierEditions[index]?.version !== expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "stale risk aggregate write was not rescued", {
        publicMessage: "This record changed while you were editing. Reload before saving.",
      });
    }
    this.snap.riskDossierEditions[index] = { ...this.snap.riskDossierEditions[index], ...patch, id } as RiskDossierEdition;
  }

  async insertPublication(record: RiskDossierPublication): Promise<void> {
    this.note("INSERT INTO risk_dossier_publications");
    this.snap.riskDossierPublications.push(record);
  }

  async updatePublication(id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void> {
    this.note("UPDATE risk_dossier_publications SET body WHERE id = $1 AND version = $2");
    const index = this.snap.riskDossierPublications.findIndex((item) => item.id === id);
    if (index < 0 || this.snap.riskDossierPublications[index]?.version !== expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "stale risk aggregate write was not rescued", {
        publicMessage: "This record changed while you were editing. Reload before saving.",
      });
    }
    this.snap.riskDossierPublications[index] = { ...this.snap.riskDossierPublications[index], ...patch, id } as RiskDossierPublication;
  }

  async insertGrant(record: RiskDossierAccessGrant): Promise<void> {
    this.note("INSERT INTO risk_dossier_access_grants");
    this.snap.riskDossierAccessGrants = this.snap.riskDossierAccessGrants ?? [];
    this.snap.riskDossierAccessGrants.push(record);
  }

  async updateGrant(id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void> {
    this.note("UPDATE risk_dossier_access_grants SET body WHERE id = $1 AND version = $2");
    const rows = this.snap.riskDossierAccessGrants ?? [];
    const index = rows.findIndex((item) => item.id === id);
    if (index < 0 || rows[index]?.version !== expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "stale risk aggregate write was not rescued", {
        publicMessage: "This record changed while you were editing. Reload before saving.",
      });
    }
    rows[index] = { ...rows[index], ...patch, id } as RiskDossierAccessGrant;
  }

  async insertClientMessage(record: RiskDossierClientMessage): Promise<void> {
    this.note("UPDATE risk_dossier_publications SET body WHERE id = $1 AND version = $2");
    const publication = this.snap.riskDossierPublications.find((item) => item.id === record.publicationId);
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
  }

  async insertExport(record: RiskDossierExport): Promise<void> {
    this.note("INSERT INTO risk_dossier_exports");
    this.snap.riskDossierExports.push(record);
  }

  async appendAudit(record: AuditEvent): Promise<void> {
    this.note("INSERT INTO platform_audit");
    this.snap.audit.push(record);
  }

  async getIdempotency(scope: RiskScope, action: string, key: string) {
    this.note("SELECT * FROM risk_idempotency_receipts WHERE organisation_id=$1 AND action=$2 AND idempotency_key=$3");
    const platform = this.snap.idempotency.find((item) => item.key === key && item.action === action);
    if (!platform) return undefined;
    return {
      organisationId: scope.organisationId,
      action,
      idempotencyKey: key,
      resultRef: platform.resultRef,
      hash: platform.hash,
      createdAt: platform.createdAt,
    };
  }

  async insertIdempotency(receipt: RiskIdempotencyReceipt) {
    this.note("INSERT INTO platform_idempotency");
    this.note("INSERT INTO risk_idempotency_receipts");
    const existing = this.snap.idempotency.find((item) => item.key === receipt.idempotencyKey && item.action === receipt.action);
    if (existing) {
      if (existing.hash !== receipt.hash || existing.resultRef !== receipt.resultRef) {
        throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
      }
      return receipt;
    }
    this.snap.idempotency.push({
      key: receipt.idempotencyKey,
      action: receipt.action,
      hash: receipt.hash,
      resultRef: receipt.resultRef,
      createdAt: receipt.createdAt,
    });
    return receipt;
  }
}

export class MemoryRiskDossierRepository implements RiskDossierRepository {
  constructor(private readonly store: PlatformStore) {}

  transactionSync<T>(work: (tx: RiskDossierTransaction) => T | Promise<T>): T {
    const snap = this.store.snapshot();
    const tx = new MemoryRiskDossierTransaction(snap);
    const result = work(tx);
    if (result && typeof (result as Promise<T>).then === "function") {
      throw new PlatformError("INTERNAL_ERROR", "memory dossier transactionSync received an unresolved promise");
    }
    this.store.replace(snap);
    return result as T;
  }

  async transaction<T>(work: (tx: RiskDossierTransaction) => Promise<T>): Promise<T> {
    const snap = this.store.snapshot();
    const tx = new MemoryRiskDossierTransaction(snap);
    try {
      const result = await work(tx);
      this.store.replace(snap);
      return result;
    } catch (error) {
      throw error;
    }
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

