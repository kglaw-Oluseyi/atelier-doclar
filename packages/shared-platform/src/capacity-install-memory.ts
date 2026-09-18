/**
 * Bounded memory-stage telemetry for CAP1000 product-install diagnosis.
 * Does not clone the platform snapshot.
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import type { PgQueryable } from "./postgres-schema.js";

export type CapacityInstallMemorySample = {
  at: string;
  elapsedMs: number;
  stage: string;
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  guestCount?: number;
  tableCount?: number;
  layoutBatch?: number;
  guestsSinceFlush?: number;
  flushDurationMs?: number;
  pendingReplaces?: number;
  collectionCounts?: Record<string, number>;
};

export type CapacityInstallMemoryRecorder = {
  mark: (
    stage: string,
    extra?: Partial<
      Omit<CapacityInstallMemorySample, "at" | "elapsedMs" | "stage" | "rss" | "heapUsed" | "heapTotal" | "external" | "arrayBuffers">
    >,
  ) => void;
  path: string;
  startedAt: number;
};

export function createCapacityInstallMemoryRecorder(path: string): CapacityInstallMemoryRecorder {
  mkdirSync(dirname(path), { recursive: true });
  const startedAt = performance.now();
  const mark: CapacityInstallMemoryRecorder["mark"] = (stage, extra = {}) => {
    const mem = process.memoryUsage();
    const sample: CapacityInstallMemorySample = {
      at: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - startedAt),
      stage,
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      ...extra,
    };
    appendFileSync(path, `${JSON.stringify(sample)}\n`);
  };
  return { mark, path, startedAt };
}

export function collectionCountsFromView(view: {
  events?: unknown[];
  operationalGuests?: unknown[];
  layouts?: unknown[];
  layoutPublications?: unknown[];
  layoutCommands?: unknown[];
  layoutRevisions?: unknown[];
  assignments?: unknown[];
}): Record<string, number> {
  return {
    events: view.events?.length ?? 0,
    operationalGuests: view.operationalGuests?.length ?? 0,
    layouts: view.layouts?.length ?? 0,
    layoutPublications: view.layoutPublications?.length ?? 0,
    layoutCommands: view.layoutCommands?.length ?? 0,
    layoutRevisions: view.layoutRevisions?.length ?? 0,
    assignments: view.assignments?.length ?? 0,
  };
}

export type PlatformCollectionCostRow = {
  source: "platform_documents" | "platform_audit" | "platform_idempotency";
  key: string;
  rowCount: number;
  bodyBytes: number;
  approxSerializedBytes: number;
};

/**
 * Read-only per-collection size via COUNT + pg_column_size. Does not clone in-memory state.
 */
export async function measurePlatformCollectionCosts(client: PgQueryable): Promise<{
  at: string;
  rows: PlatformCollectionCostRow[];
}> {
  const result = await client.query<{
    source: PlatformCollectionCostRow["source"];
    key: string;
    row_count: string | number;
    body_bytes: string | number;
    approx_bytes: string | number;
  }>(
    `
    SELECT 'platform_documents'::text AS source, collection AS key,
           COUNT(*)::bigint AS row_count,
           COALESCE(SUM(pg_column_size(body)),0)::bigint AS body_bytes,
           COALESCE(SUM(pg_column_size(collection) + pg_column_size(id) + pg_column_size(body)
             + COALESCE(pg_column_size(organisation_id),0) + COALESCE(pg_column_size(client_id),0)
             + COALESCE(pg_column_size(event_id),0) + pg_column_size(version)),0)::bigint AS approx_bytes
    FROM platform_documents
    GROUP BY collection
    UNION ALL
    SELECT 'platform_audit', '(all)', COUNT(*)::bigint,
           COALESCE(SUM(pg_column_size(body)),0)::bigint,
           COALESCE(SUM(pg_column_size(body)),0)::bigint
    FROM platform_audit
    UNION ALL
    SELECT 'platform_idempotency', '(all)', COUNT(*)::bigint,
           COALESCE(SUM(pg_column_size(body)),0)::bigint,
           COALESCE(SUM(pg_column_size(key) + pg_column_size(action) + pg_column_size(hash)
             + pg_column_size(result_ref) + pg_column_size(created_at) + pg_column_size(body)),0)::bigint
    FROM platform_idempotency
    `,
  );
  const rows: PlatformCollectionCostRow[] = result.rows
    .map((row) => ({
      source: row.source,
      key: row.key,
      rowCount: Number(row.row_count),
      bodyBytes: Number(row.body_bytes),
      approxSerializedBytes: Number(row.approx_bytes),
    }))
    .sort((a, b) => b.approxSerializedBytes - a.approxSerializedBytes);
  return { at: new Date().toISOString(), rows };
}

export function writePlatformCollectionCostsArtifact(
  path: string,
  payload: { at: string; stage: string; rows: PlatformCollectionCostRow[]; rss?: number; heapUsed?: number },
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload)}\n`);
}
