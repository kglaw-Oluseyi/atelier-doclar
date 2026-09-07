import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Pool } from "pg";
import {
  ACCESS_LIFECYCLE_PROBE_VENDOR_ID,
  FIXTURE_IDS,
  PlatformError,
  PlatformService,
  PostgresPlatformStore,
  S04C_FIXTURE_IDS,
  cleanupAccessLifecycleProbe,
  recordCleanupAudit,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

const enabled = process.env.EVENT_OS_PERSISTENCE_IT === "1" && Boolean(process.env.DATABASE_URL);

function adapt(pool: Pool): PgQueryable & { transaction<T>(fn: (queryable: PgQueryable) => Promise<T>): Promise<T> } {
  const queryable: PgQueryable = {
    async query<T extends object>(text: string, values?: unknown[]) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  };
  return {
    ...queryable,
    async transaction<T>(fn) {
      const connected = await pool.connect();
      try {
        await connected.query("BEGIN");
        const result = await fn({
          async query<R extends object>(text: string, values?: unknown[]) {
            const inner = await connected.query(text, values);
            return { rows: inner.rows as R[], rowCount: inner.rowCount ?? 0 };
          },
        });
        await connected.query("COMMIT");
        return result;
      } catch (error) {
        await connected.query("ROLLBACK");
        throw error;
      } finally {
        connected.release();
      }
    },
  };
}

describe("live postgres access lifecycle probe", () => {
  it("skips unless EVENT_OS_PERSISTENCE_IT=1 and DATABASE_URL are set", async () => {
    if (!enabled) {
      assert.equal(process.env.EVENT_OS_PERSISTENCE_IT === "1", false);
      return;
    }
    const url = process.env.DATABASE_URL;
    assert.ok(url);
    const pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 8_000 });
    const client = adapt(pool);
    const writerA = await PostgresPlatformStore.open(client);
    const serviceA = new PlatformService(writerA);
    const actor = {
      personId: FIXTURE_IDS.personDirector,
      correlationId: "lifecycle-probe",
      now: "2026-09-07T15:00:00.000Z",
      actorKind: "HUMAN" as const,
    };
    const created = serviceA.createVendorAssignment(actor, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      vendorId: ACCESS_LIFECYCLE_PROBE_VENDOR_ID,
      vendorDisplayName: "EOS-S04C lifecycle probe",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: "2026-12-31T00:00:00.000Z",
      reason: "isolated lifecycle probe",
    });
    await writerA.flush();
    const writerB = await PostgresPlatformStore.open(client);
    const serviceB = new PlatformService(writerB);
    serviceA.renewVendorAssignment(actor, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      assignmentId: created.assignment.id,
      expiresAt: "2026-12-31T00:00:00.000Z",
      expectedVersion: created.assignment.version,
      reason: "probe first renew",
      idempotencyKey: "probe-renew-a",
    });
    await writerA.flush();
    serviceB.renewVendorAssignment(actor, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      assignmentId: created.assignment.id,
      expiresAt: "2027-01-15T00:00:00.000Z",
      expectedVersion: created.assignment.version,
      reason: "probe stale renew",
      idempotencyKey: "probe-renew-b",
    });
    await assert.rejects(
      () => writerB.flush(),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const durable = await PostgresPlatformStore.open(client);
    assert.equal(
      durable.snapshot().vendorAssignments.find((item) => item.id === created.assignment.id)?.expiresAt,
      "2026-12-31T00:00:00.000Z",
    );
    const cleaned = await cleanupAccessLifecycleProbe(client);
    assert.ok(cleaned.deletedAssignments >= 1);
    await recordCleanupAudit(
      client,
      {
        mode: "EXECUTED",
        destructive: true,
        seedId: "eos-s04c-lifecycle-probe",
        collections: [{ collection: "vendorAssignments", count: cleaned.deletedAssignments }],
        total: cleaned.deletedAssignments,
      },
      { mode: "EXECUTED", confirmed: true },
    );
    await pool.end();
  });
});
