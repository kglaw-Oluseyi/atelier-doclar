import { PlatformError } from "./errors.js";
import { runPlatformMigrations } from "./migrations.js";
import { PRODUCTION_STORE_STATUS, type StoreProductionStatus } from "./constants.js";
import type { AuditEvent } from "./schemas.js";
import { emptySnapshot, normalizeSnapshot, type IdempotencyRecord, type PlatformSnapshot, type PlatformStore } from "./store.js";
import { validateS04APersistedCollections } from "./addressing-persistence.js";
import { validateS04BPersistedCollections } from "./programme-persistence.js";
import { validateS04CPersistedCollections } from "./merchandise-persistence.js";
import { validateS04DPersistedCollections } from "./forecast-persistence.js";
import type { PgQueryable, PgQueryResult, PgTransactor } from "./postgres-schema.js";

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
  "programmeDays",
  "programmePhases",
  "phaseEntitlements",
  "arrivalRoutes",
  "perimeterCheckpoints",
  "accessZones",
  "credentialProjections",
  "operationalVehicles",
  "vehicleAssociations",
  "offlineAccessPackages",
  "accessExceptions",
  "s04bMigrationReceipts",
  "merchandiseCollections",
  "merchandiseItems",
  "merchandiseItemVariants",
  "merchandiseCohorts",
  "merchandiseCohortMembers",
  "hostOfferRules",
  "guestOffers",
  "guestParticipations",
  "capMeasurements",
  "merchandiseFulfilments",
  "vendorAssignments",
  "vendorUpdates",
  "vendorSessions",
  "merchandiseGuestGrants",
  "merchandiseGuestSessions",
  "externalContactLinks",
  "merchandiseExceptions",
  "s04cMigrationReceipts",
  "forecastPolicies",
  "modelParameterSets",
  "attendanceForecastRuns",
  "forecastPopulationMembers",
  "forecastEstimates",
  "uncertaintyDrivers",
  "confidenceAssessments",
  "forecastOverrides",
  "operationalProvisionRecommendations",
  "calibrationObservations",
  "forecastEvaluations",
  "s04dMigrationReceipts",
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

function asBody<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

export class PostgresPlatformStore implements PlatformStore {
  readonly productionStatus: StoreProductionStatus = PRODUCTION_STORE_STATUS;
  private state: PlatformSnapshot = emptySnapshot();
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly client: PgQueryable) {}

  static async migrate(client: PgQueryable): Promise<void> {
    await runPlatformMigrations(client);
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

  async flush(): Promise<void> {
    await this.pending;
  }

  replace(next: PlatformSnapshot): void {
    const normalised = normalizeSnapshot(next);
    validateS04APersistedCollections(normalised);
    validateS04BPersistedCollections(normalised);
    validateS04CPersistedCollections(normalised);
    validateS04DPersistedCollections(normalised);
    const previous = this.snapshot();
    this.state = structuredClone(normalised);
    this.pending = this.pending
      .catch(() => undefined)
      .then(() => this.persistTransactional(previous, normalised))
      .catch(async (error) => {
        await this.hydrate();
        throw error;
      });
  }

  async replaceAsync(next: PlatformSnapshot): Promise<void> {
    this.replace(next);
    await this.flush();
  }

  private async persistTransactional(previous: PlatformSnapshot, normalised: PlatformSnapshot): Promise<void> {
    const run = async (tx: PgQueryable) => {
      for (const collection of COLLECTIONS) {
        const previousById = new Map(
          (previous[collection] as Array<Record<string, unknown>>).map((item) => [idOf(collection, item), item]),
        );
        const remaining = new Set<string>();
        for (const record of normalised[collection] as Array<Record<string, unknown>>) {
          const id = idOf(collection, record);
          remaining.add(id);
          const existed = previousById.get(id);
          const incomingVersion = Number(record.version ?? 1);
          if (!existed) {
            await tx.query(
              "INSERT INTO platform_documents (collection, id, organisation_id, client_id, event_id, version, body) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)",
              [
                collection,
                id,
                record.organisationId ?? null,
                record.clientId ?? null,
                record.eventId ?? null,
                incomingVersion,
                JSON.stringify(record),
              ],
            );
            continue;
          }
          const persistedVersion = Number(existed.version ?? 1);
          const sameBody = JSON.stringify(existed) === JSON.stringify(record);
          if (incomingVersion < persistedVersion || (incomingVersion === persistedVersion && !sameBody)) {
            throw new PlatformError("VERSION_CONFLICT", "persisted version conflict", {
              publicMessage: "This record changed while you were editing. Reload before saving.",
            });
          }
          if (sameBody) continue;
          const result = await tx.query(
            "UPDATE platform_documents SET organisation_id=$3, client_id=$4, event_id=$5, version=$6, body=$7::jsonb WHERE collection=$1 AND id=$2 AND version=$8",
            [
              collection,
              id,
              record.organisationId ?? null,
              record.clientId ?? null,
              record.eventId ?? null,
              incomingVersion,
              JSON.stringify(record),
              persistedVersion,
            ],
          );
          if ((result.rowCount ?? 0) === 0) {
            throw new PlatformError("VERSION_CONFLICT", "persisted version conflict", {
              publicMessage: "This record changed while you were editing. Reload before saving.",
            });
          }
        }
        for (const [id, existed] of previousById) {
          if (remaining.has(id)) continue;
          const persistedVersion = Number(existed.version ?? 1);
          const result = await tx.query(
            "DELETE FROM platform_documents WHERE collection=$1 AND id=$2 AND version=$3",
            [collection, id, persistedVersion],
          );
          if ((result.rowCount ?? 0) > 0) continue;
          const existing = await tx.query<{ version: number }>(
            "SELECT version FROM platform_documents WHERE collection=$1 AND id=$2",
            [collection, id],
          );
          if ((existing.rowCount ?? 0) > 0) {
            throw new PlatformError("VERSION_CONFLICT", "persisted version conflict", {
              publicMessage: "This record changed while you were editing. Reload before saving.",
            });
          }
          // Concurrent delete/delete: a versioned DELETE that matches no row, and
          // the durable key is already absent, is an idempotent success. The
          // second writer does not receive VERSION_CONFLICT. If the row still
          // exists at another version, that is a stale delete and conflicts.
        }
      }
      for (const entry of normalised.audit) {
        if (!previous.audit.some((item) => item.id === entry.id)) {
          await tx.query(
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
          await tx.query(
            "INSERT INTO platform_idempotency (key, action, hash, result_ref, created_at, body) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
            [entry.key, entry.action, entry.hash, entry.resultRef, entry.createdAt, JSON.stringify(entry)],
          );
        }
      }
    };
    if (hasTransaction(this.client)) {
      await this.client.transaction(run);
      return;
    }
    await run(this.client);
  }

  private async hydrate(): Promise<void> {
    const next = emptySnapshot();
    const docs = await this.client.query<{ collection: Collection; body: unknown }>(
      "SELECT collection, body FROM platform_documents",
    );
    for (const row of docs.rows) {
      (next[row.collection] as unknown[]).push(asBody(row.body));
    }
    const audit = await this.client.query<{ body: unknown }>("SELECT body FROM platform_audit");
    next.audit = audit.rows.map((row) => asBody<AuditEvent>(row.body));
    const idem = await this.client.query<{ body: unknown }>("SELECT body FROM platform_idempotency");
    next.idempotency = idem.rows.map((row) => asBody<IdempotencyRecord>(row.body));
    const normalised = normalizeSnapshot(next);
    validateS04APersistedCollections(normalised);
    validateS04BPersistedCollections(normalised);
    validateS04CPersistedCollections(normalised);
    validateS04DPersistedCollections(normalised);
    this.state = normalised;
  }
}

interface MemoryDocumentRow {
  collection: string;
  id: string;
  organisation_id: string | null;
  client_id: string | null;
  event_id: string | null;
  version: number;
  body: unknown;
}

export class MemoryPlatformPg implements PgTransactor {
  readonly documents: MemoryDocumentRow[] = [];
  readonly audit: unknown[] = [];
  readonly idempotency: Array<IdempotencyRecord & { body: unknown }> = [];
  readonly migrations: Array<{ id: string; applied_at: string; checksum: string }> = [];
  readonly seeds: Array<{
    seed_id: string;
    seed_version: string;
    applied_at: string;
    record_count: number;
    synthetic: boolean;
  }> = [];
  readonly cleanup: Array<{
    id: string;
    occurred_at: string;
    mode: string;
    seed_id: string | null;
    collections: unknown;
    confirmed: boolean;
  }> = [];
  private failNext = false;
  private snapshot: {
    documents: MemoryDocumentRow[];
    audit: unknown[];
    idempotency: Array<IdempotencyRecord & { body: unknown }>;
    migrations: Array<{ id: string; applied_at: string; checksum: string }>;
    seeds: MemoryPlatformPg["seeds"];
    cleanup: MemoryPlatformPg["cleanup"];
  } | undefined;

  failNextWrite(): void {
    this.failNext = true;
  }

  async transaction<T>(fn: (client: PgQueryable) => Promise<T>): Promise<T> {
    this.snapshot = {
      documents: structuredClone(this.documents),
      audit: structuredClone(this.audit),
      idempotency: structuredClone(this.idempotency),
      migrations: structuredClone(this.migrations),
      seeds: structuredClone(this.seeds),
      cleanup: structuredClone(this.cleanup),
    };
    try {
      const result = await fn(this);
      this.snapshot = undefined;
      return result;
    } catch (error) {
      this.restore();
      throw error;
    }
  }

  private restore(): void {
    if (!this.snapshot) return;
    this.documents.splice(0, this.documents.length, ...this.snapshot.documents);
    this.audit.splice(0, this.audit.length, ...this.snapshot.audit);
    this.idempotency.splice(0, this.idempotency.length, ...this.snapshot.idempotency);
    this.migrations.splice(0, this.migrations.length, ...this.snapshot.migrations);
    this.seeds.splice(0, this.seeds.length, ...this.snapshot.seeds);
    this.cleanup.splice(0, this.cleanup.length, ...this.snapshot.cleanup);
    this.snapshot = undefined;
  }

  async query<T extends object = Record<string, unknown>>(
    text: string,
    values: unknown[] = [],
  ): Promise<PgQueryResult<T>> {
    const statements = text
      .split(";")
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    let last: PgQueryResult<T> = { rows: [], rowCount: 0 };
    for (const sql of statements) {
      last = await this.exec<T>(sql, values);
    }
    return last;
  }

  private async exec<T extends object>(sql: string, values: unknown[]): Promise<PgQueryResult<T>> {
    if (sql === "BEGIN") {
      this.snapshot = {
        documents: structuredClone(this.documents),
        audit: structuredClone(this.audit),
        idempotency: structuredClone(this.idempotency),
        migrations: structuredClone(this.migrations),
        seeds: structuredClone(this.seeds),
        cleanup: structuredClone(this.cleanup),
      };
      return { rows: [], rowCount: 0 };
    }
    if (sql === "COMMIT") {
      this.snapshot = undefined;
      return { rows: [], rowCount: 0 };
    }
    if (sql === "ROLLBACK") {
      this.restore();
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith("CREATE TABLE")) return { rows: [], rowCount: 0 };
    if (this.failNext && sql.startsWith("INSERT")) {
      this.failNext = false;
      throw new Error("synthetic write failure");
    }
    if (sql.startsWith("SELECT id, checksum FROM platform_schema_migrations")) {
      return { rows: this.migrations.map((row) => ({ id: row.id, checksum: row.checksum })) as T[], rowCount: this.migrations.length };
    }
    if (sql.startsWith("INSERT INTO platform_schema_migrations")) {
      const [id, appliedAt, checksum] = values as [string, string, string];
      if (this.migrations.some((row) => row.id === id)) throw new Error("unique_violation");
      this.migrations.push({ id, applied_at: appliedAt, checksum });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("SELECT seed_id, seed_version")) {
      const seedId = String(values[0] ?? "");
      return {
        rows: this.seeds.filter((row) => row.seed_id === seedId) as T[],
        rowCount: this.seeds.filter((row) => row.seed_id === seedId).length,
      };
    }
    if (sql.startsWith("INSERT INTO platform_seed_ledger")) {
      const [seedId, seedVersion, appliedAt, recordCount] = values as [string, string, string, number];
      if (!this.seeds.some((row) => row.seed_id === seedId)) {
        this.seeds.push({
          seed_id: seedId,
          seed_version: seedVersion,
          applied_at: appliedAt,
          record_count: recordCount,
          synthetic: true,
        });
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith("INSERT INTO platform_cleanup_audit")) {
      this.cleanup.push({
        id: String(values[0]),
        occurred_at: String(values[1]),
        mode: String(values[2]),
        seed_id: values[3] == null ? null : String(values[3]),
        collections: typeof values[4] === "string" ? JSON.parse(String(values[4])) : values[4],
        confirmed: Boolean(values[5]),
      });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("SELECT version FROM platform_documents")) {
      const [collection, id] = values as [string, string];
      const row = this.documents.find((item) => item.collection === collection && item.id === id);
      if (!row) return { rows: [], rowCount: 0 };
      return { rows: [{ version: row.version }] as T[], rowCount: 1 };
    }
    if (sql.startsWith("SELECT collection, body FROM platform_documents")) {
      return { rows: this.documents.map((row) => ({ collection: row.collection, body: row.body })) as T[], rowCount: this.documents.length };
    }
    if (sql.startsWith("SELECT body FROM platform_audit")) {
      return { rows: this.audit.map((body) => ({ body })) as T[], rowCount: this.audit.length };
    }
    if (sql.startsWith("SELECT body FROM platform_idempotency")) {
      return { rows: this.idempotency.map((row) => ({ body: row.body })) as T[], rowCount: this.idempotency.length };
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
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE platform_documents")) {
      const [collection, id, organisationId, clientId, eventId, version, bodyJson, expectedVersion] = values as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        number,
        string,
        number | undefined,
      ];
      const row = this.documents.find((item) => item.collection === collection && item.id === id);
      if (!row) return { rows: [], rowCount: 0 };
      if (expectedVersion !== undefined && Number(row.version) !== Number(expectedVersion)) {
        return { rows: [], rowCount: 0 };
      }
      row.organisation_id = organisationId;
      row.client_id = clientId;
      row.event_id = eventId;
      row.version = version;
      row.body = JSON.parse(bodyJson);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("DELETE FROM platform_documents")) {
      if (!sql.includes("AND version")) {
        throw new Error("unversioned document delete is forbidden");
      }
      const [collection, id, version] = values as [string, string, number];
      const index = this.documents.findIndex(
        (row) => row.collection === collection && row.id === id && Number(row.version) === Number(version),
      );
      if (index < 0) return { rows: [], rowCount: 0 };
      this.documents.splice(index, 1);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("INSERT INTO platform_audit")) {
      this.audit.push(JSON.parse(String(values[7])));
      return { rows: [], rowCount: 1 };
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
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`unsupported test SQL: ${sql}`);
  }
}
