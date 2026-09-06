import { S04A_STORE_COLLECTIONS, validateS04APersistedCollections } from "./addressing-persistence.js";
import { PRODUCTION_STORE_STATUS, type StoreProductionStatus } from "./constants.js";
import type { AuditEvent } from "./schemas.js";
import { emptySnapshot, normalizeSnapshot, type IdempotencyRecord, type PlatformSnapshot, type PlatformStore } from "./store.js";
import { PLATFORM_POSTGRES_SCHEMA, type PgQueryable } from "./postgres-schema.js";

type Collection = keyof Omit<PlatformSnapshot, "audit" | "idempotency">;

const COLLECTIONS: Collection[] = [
  "organisations",
  "clients",
  "programmes",
  "events",
  "phaseHistory",
  "persons",
  "memberships",
  "roles",
  "permissions",
  "rolePermissions",
  "assignments",
  "masterEventFiles",
  "consents",
  "guestReferences",
  "operationalGuests",
  "guestHouseholds",
  "guestDuplicateCandidates",
  "guestIntakeBatches",
  "guestIntakeRows",
  "guestParties",
  "guestPartyMembers",
  "guestRelationships",
  "companionEntitlements",
  "companionNominations",
  "responsibleAdultLinks",
  "eventSeries",
  "eventSeriesMembers",
  "addressingReconciliationItems",
  "s04aMigrationReceipts",
  "rsvpPolicies",
  "rsvpQuestionnaires",
  "rsvpInvitations",
  "rsvpGuestSessions",
  "staffSessions",
  "rsvpResponses",
  "rsvpReceipts",
  "rsvpEntitlements",
  "rsvpExceptions",
  "rsvpAssistanceRequests",
  "rsvpKeyRings",
  "rsvpEventProjections",
  "channelPolicies",
  "guestSafeOccasions",
  "contactProjections",
  "suppressionEntries",
  "messageTemplates",
  "messageTemplateVersions",
  "audienceDefinitions",
  "audienceSnapshots",
  "campaigns",
  "campaignApprovals",
  "commsMessages",
  "messageContentSnapshots",
  "messageAttempts",
  "deliveryEvents",
  "commsOutbox",
  "conversationThreads",
  "inboundMessages",
  "followUpTasks",
  "contactCorrections",
  "commsNotifications",
  "commsIntelligenceAlerts",
  "policyVersions",
];

function idOf(collection: Collection, record: Record<string, unknown>): string {
  if (collection === "rolePermissions") {
    return `${String(record.roleId)}:${String(record.permissionId)}`;
  }
  return String(record.id);
}

export class PostgresPlatformStore implements PlatformStore {
  readonly productionStatus: StoreProductionStatus = PRODUCTION_STORE_STATUS;
  private state: PlatformSnapshot = emptySnapshot();

  constructor(private readonly client: PgQueryable) {}

  static async migrate(client: PgQueryable): Promise<void> {
    await client.query(PLATFORM_POSTGRES_SCHEMA);
  }

  static async open(client: PgQueryable): Promise<PostgresPlatformStore> {
    await PostgresPlatformStore.migrate(client);
    const store = new PostgresPlatformStore(client);
    await store.hydrate();
    return store;
  }

  snapshot(): PlatformSnapshot {
    return structuredClone(this.state);
  }

  replace(_next: PlatformSnapshot): void {
    throw new Error("PostgresPlatformStore.replace is async; use replaceAsync");
  }

  async replaceAsync(next: PlatformSnapshot): Promise<void> {
    const normalised = normalizeSnapshot(next);
    validateS04APersistedCollections(normalised);
    const previous = this.snapshot();
    for (const collection of COLLECTIONS) {
      for (const record of normalised[collection] as Array<Record<string, unknown>>) {
        const existed = (previous[collection] as Array<Record<string, unknown>>).some(
          (item) => idOf(collection, item) === idOf(collection, record),
        );
        if (!existed) {
          await this.client.query(
            "INSERT INTO platform_documents (collection, id, organisation_id, client_id, event_id, version, body) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)",
            [
              collection,
              idOf(collection, record),
              record.organisationId ?? null,
              record.clientId ?? null,
              record.eventId ?? null,
              record.version ?? 1,
              JSON.stringify(record),
            ],
          );
        } else {
          await this.client.query(
            "UPDATE platform_documents SET organisation_id=$3, client_id=$4, event_id=$5, version=$6, body=$7::jsonb WHERE collection=$1 AND id=$2",
            [
              collection,
              idOf(collection, record),
              record.organisationId ?? null,
              record.clientId ?? null,
              record.eventId ?? null,
              record.version ?? 1,
              JSON.stringify(record),
            ],
          );
        }
      }
    }
    for (const collection of S04A_STORE_COLLECTIONS) {
      const remaining = new Set(
        (normalised[collection] as Array<Record<string, unknown>>).map((record) => idOf(collection, record)),
      );
      for (const record of previous[collection] as Array<Record<string, unknown>>) {
        const id = idOf(collection, record);
        if (remaining.has(id)) continue;
        await this.client.query("DELETE FROM platform_documents WHERE collection=$1 AND id=$2", [collection, id]);
      }
    }
    for (const entry of normalised.audit) {
      if (!previous.audit.some((item) => item.id === entry.id)) {
        await this.client.query(
          "INSERT INTO platform_audit (id, occurred_at, organisation_id, client_id, event_id, action, outcome, body) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)",
          [
            entry.id,
            entry.occurredAt,
            entry.organisationId ?? null,
            entry.clientId ?? null,
            entry.eventId ?? null,
            entry.action,
            entry.outcome,
            JSON.stringify(entry),
          ],
        );
      }
    }
    for (const entry of normalised.idempotency) {
      if (!previous.idempotency.some((item) => item.key === entry.key)) {
        await this.client.query(
          "INSERT INTO platform_idempotency (key, action, hash, result_ref, created_at, body) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
          [entry.key, entry.action, entry.hash, entry.resultRef, entry.createdAt, JSON.stringify(entry)],
        );
      }
    }
    this.state = structuredClone(normalised);
  }

  private async hydrate(): Promise<void> {
    const next = emptySnapshot();
    const docs = await this.client.query<{ collection: Collection; body: Record<string, unknown> }>(
      "SELECT collection, body FROM platform_documents",
    );
    for (const row of docs.rows) {
      (next[row.collection] as unknown[]).push(row.body);
    }
    const audit = await this.client.query<{ body: AuditEvent }>("SELECT body FROM platform_audit");
    next.audit = audit.rows.map((row) => row.body);
    const idem = await this.client.query<{ body: IdempotencyRecord }>("SELECT body FROM platform_idempotency");
    next.idempotency = idem.rows.map((row) => row.body);
    const normalised = normalizeSnapshot(next);
    validateS04APersistedCollections(normalised);
    this.state = normalised;
  }
}

export class MemoryPlatformPg implements PgQueryable {
  readonly documents: Array<{
    collection: string;
    id: string;
    organisation_id: string | null;
    client_id: string | null;
    event_id: string | null;
    version: number;
    body: unknown;
  }> = [];
  readonly audit: unknown[] = [];
  readonly idempotency: Array<IdempotencyRecord & { body: unknown }> = [];

  async query<T extends object = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
    const sql = text.replace(/\s+/g, " ").trim();
    if (sql.startsWith("CREATE TABLE")) return { rows: [] };
    if (sql.startsWith("SELECT collection, body FROM platform_documents")) {
      return { rows: this.documents.map((row) => ({ collection: row.collection, body: row.body })) as T[] };
    }
    if (sql.startsWith("SELECT body FROM platform_audit")) {
      return { rows: this.audit.map((body) => ({ body })) as T[] };
    }
    if (sql.startsWith("SELECT body FROM platform_idempotency")) {
      return { rows: this.idempotency.map((row) => ({ body: row.body })) as T[] };
    }
    if (sql.startsWith("INSERT INTO platform_documents")) {
      const [collection, id, organisationId, clientId, eventId, version, bodyJson] = values as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        number,
        string,
      ];
      if (this.documents.some((row) => row.collection === collection && row.id === id)) {
        throw new Error("unique_violation");
      }
      this.documents.push({
        collection,
        id,
        organisation_id: organisationId,
        client_id: clientId,
        event_id: eventId,
        version,
        body: JSON.parse(bodyJson),
      });
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE platform_documents")) {
      const [collection, id, organisationId, clientId, eventId, version, bodyJson] = values as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        number,
        string,
      ];
      const row = this.documents.find((item) => item.collection === collection && item.id === id);
      if (row) {
        row.organisation_id = organisationId;
        row.client_id = clientId;
        row.event_id = eventId;
        row.version = version;
        row.body = JSON.parse(bodyJson);
      }
      return { rows: [] };
    }
    if (sql.startsWith("DELETE FROM platform_documents")) {
      const [collection, id] = values as [string, string];
      for (let index = this.documents.length - 1; index >= 0; index -= 1) {
        const row = this.documents[index];
        if (row && row.collection === collection && row.id === id) {
          this.documents.splice(index, 1);
        }
      }
      return { rows: [] };
    }
    if (sql.startsWith("INSERT INTO platform_audit")) {
      this.audit.push(JSON.parse(String(values[7])));
      return { rows: [] };
    }
    if (sql.startsWith("INSERT INTO platform_idempotency")) {
      this.idempotency.push({
        key: String(values[0]),
        action: String(values[1]),
        hash: String(values[2]),
        resultRef: String(values[3]),
        createdAt: String(values[4]),
        body: JSON.parse(String(values[5])),
      });
      return { rows: [] };
    }
    throw new Error(`unsupported test SQL: ${sql}`);
  }
}
