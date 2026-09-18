import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import type { RiskDossierClientMessage } from "./risk-dossier-decisions.js";
import type { RiskProjectionAudience } from "./risk-disclosure.js";
import type {
  RiskApplicabilitySnapshot,
  RiskDossierAccessGrant,
  RiskDossierEdition,
  RiskDossierPublication,
  RiskIdempotencyReceipt,
} from "./risk-schemas.js";
import type { RiskSafePatch, RiskScope } from "./risk-repository.js";
import type { RiskIdempotencyRecord } from "./risk-store.js";

export type RiskDossierLock = "FOR_UPDATE";

export type RiskDossierWorkspace = {
  event: { id: string; organisationId: string; name: string };
  applicability?: { id: string; contentHash: string; overall: string; evaluatedAt: string };
  workingEdition?: RiskDossierEdition;
  currentPublication?: RiskDossierPublication;
  publishedEdition?: RiskDossierEdition;
  recentEditions: RiskDossierEdition[];
  recentPublications: RiskDossierPublication[];
  grants: RiskDossierAccessGrant[];
};

export interface RiskDossierTransaction {
  loadEdition(id: string, scope: RiskScope, lock?: RiskDossierLock): Promise<RiskDossierEdition | undefined>;
  loadCurrentWorking(scope: Required<RiskScope>, lock?: RiskDossierLock): Promise<RiskDossierEdition | undefined>;
  loadAnyCurrentEdition(scope: Required<RiskScope>, lock?: RiskDossierLock): Promise<RiskDossierEdition | undefined>;
  loadCurrentPublication(scope: Required<RiskScope>, lock?: RiskDossierLock): Promise<RiskDossierPublication | undefined>;
  loadPublicationEdition(scope: Required<RiskScope>): Promise<{ publication: RiskDossierPublication; edition: RiskDossierEdition } | undefined>;
  loadApplicabilitySnapshot(
    idOrHash: { eventId: string; id?: string; contentHash?: string },
    scope: RiskScope,
  ): Promise<RiskApplicabilitySnapshot | undefined>;
  loadRuleMandatory(id: string, scope: RiskScope): Promise<boolean | undefined>;
  countEventEditions(scope: Required<RiskScope>): Promise<number>;
  countEventPublications(scope: Required<RiskScope>): Promise<number>;
  listEventEditions(scope: Required<RiskScope>, options?: { limit?: number; cursor?: string }): Promise<RiskDossierEdition[]>;
  listEventPublications(scope: Required<RiskScope>, options?: { limit?: number; cursor?: string }): Promise<RiskDossierPublication[]>;
  loadGrant(id: string, scope: RiskScope, lock?: RiskDossierLock): Promise<RiskDossierAccessGrant | undefined>;
  findGrantByTokenHash(tokenHash: string): Promise<RiskDossierAccessGrant | undefined>;
  findActiveGrant(scope: Required<RiskScope>, lock?: RiskDossierLock): Promise<RiskDossierAccessGrant | undefined>;
  listEventGrants(scope: Required<RiskScope>, options?: { limit?: number }): Promise<RiskDossierAccessGrant[]>;
  loadEventIdentity(scope: Required<RiskScope>): Promise<{ id: string; organisationId: string; name: string } | undefined>;
  loadAssignment(
    id: string,
    scope: RiskScope,
  ): Promise<{ id: string; personId: string; organisationId: string; eventId?: string; status: string; roleId: string } | undefined>;
  insertEdition(record: RiskDossierEdition): Promise<void>;
  updateEdition(id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void>;
  insertPublication(record: RiskDossierPublication): Promise<void>;
  updatePublication(id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void>;
  insertGrant(record: RiskDossierAccessGrant): Promise<void>;
  updateGrant(id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void>;
  insertClientMessage(record: RiskDossierClientMessage): Promise<void>;
  insertExport(record: import("./risk-schemas.js").RiskDossierExport): Promise<void>;
  appendAudit(record: AuditEvent): Promise<void>;
  getIdempotency(scope: RiskScope, action: string, key: string): Promise<RiskIdempotencyRecord | undefined>;
  insertIdempotency(receipt: RiskIdempotencyReceipt): Promise<RiskIdempotencyRecord>;
  recordedQueries(): string[];
}

export interface RiskDossierRepository {
  transaction<T>(work: (tx: RiskDossierTransaction) => Promise<T>): Promise<T>;
  transactionSync?<T>(work: (tx: RiskDossierTransaction) => T | Promise<T>): T;
  getWorkspace(input: {
    organisationId: string;
    eventId: string;
    actorProjection: RiskProjectionAudience;
  }): Promise<RiskDossierWorkspace>;
}

export const BROAD_DOSSIER_QUERY = /loadAll|loadOrganisation|writeRiskSnapshotDelta|FROM risk_rule_editions(?! WHERE)|FROM risk_polic|FROM risk_incident|FROM risk_source/i;

export function assertBoundedDossierQueries(queries: string[]): void {
  for (const sql of queries) {
    if (BROAD_DOSSIER_QUERY.test(sql) || /SELECT body FROM risk_[a-z_]+$/.test(sql.trim())) {
      throw new Error(`broad dossier query is forbidden: ${sql}`);
    }
  }
}

export async function workspaceFromTransaction(
  tx: RiskDossierTransaction,
  input: { organisationId: string; eventId: string },
): Promise<RiskDossierWorkspace> {
  const scope = { organisationId: input.organisationId, eventId: input.eventId };
  const event = await tx.loadEventIdentity(scope);
  if (!event) throw new PlatformError("SCOPE_MISMATCH", "event is outside this organisation");
  const [applicability, workingEdition, published, recentEditions, recentPublications, grants] = await Promise.all([
    tx.loadApplicabilitySnapshot({ eventId: input.eventId }, scope),
    tx.loadCurrentWorking(scope),
    tx.loadPublicationEdition(scope),
    tx.listEventEditions(scope, { limit: 12 }),
    tx.listEventPublications(scope, { limit: 12 }),
    tx.listEventGrants(scope, { limit: 12 }),
  ]);
  return {
    event,
    applicability: applicability
      ? { id: applicability.id, contentHash: applicability.contentHash, overall: applicability.overall, evaluatedAt: applicability.evaluatedAt }
      : undefined,
    workingEdition,
    currentPublication: published?.publication,
    publishedEdition: published?.edition,
    recentEditions,
    recentPublications,
    grants,
  };
}
