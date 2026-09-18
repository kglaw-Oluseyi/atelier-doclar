import pg from "pg";

export type Queryable = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
};

let pool: pg.Pool | null = null;

export function getPool(connectionString = process.env.DATABASE_URL): pg.Pool {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (!pool) pool = new pg.Pool({ connectionString, max: 8 });
  return pool;
}

export async function withTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO eos_s01");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rows<T>(
  client: Queryable,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await client.query(sql, params);
  return result.rows as T[];
}

export async function one<T>(
  client: Queryable,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const result = await rows<T>(client, sql, params);
  return result[0] ?? null;
}
