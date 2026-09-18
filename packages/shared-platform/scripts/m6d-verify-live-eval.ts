import pg from "pg";

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const eventId = "92909476-d3f9-43f1-a5f7-7e1a83c92fbd";
  const adoptionId = "3b771ad9-c4c9-401b-87df-0371f9eee840";
  const runId = "9ba506b1-dadc-478b-a857-051180307526";

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%eval%' OR table_name ILIKE '%ledger%' OR table_name ILIKE '%publication%' OR table_name ILIKE '%audit%' ORDER BY 1`,
  );
  console.log("TABLES", tables.rows.map((r) => r.table_name));

  for (const t of [
    "cpsat_durable_seating_evaluation",
    "cpsat_seating_evaluation",
    "durable_seating_evaluation",
  ]) {
    try {
      const r = await pool.query(`SELECT * FROM ${t} WHERE event_id=$1 ORDER BY 1 DESC LIMIT 3`, [eventId]);
      console.log(`TABLE ${t}`, JSON.stringify(r.rows, null, 2));
    } catch (e) {
      console.log(`TABLE ${t} ERR`, (e as Error).message.split("\n")[0]);
    }
  }

  const recent = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='audit_ledger_event' ORDER BY ordinal_position`,
  ).catch(() => ({ rows: [] as { column_name: string }[] }));
  console.log("LEDGER_COLS", recent.rows.map((r) => r.column_name));

  const ledgerTables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%ledger%' OR table_name ILIKE '%audit%')`,
  );
  for (const { table_name } of ledgerTables.rows) {
    try {
      const r = await pool.query(
        `SELECT * FROM ${table_name} WHERE (to_jsonb(t) #>> '{}') IS NOT NULL FROM ${table_name} t LIMIT 0`,
      );
      void r;
    } catch {
      /* ignore */
    }
    try {
      const cols = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name=$1`,
        [table_name],
      );
      const names = cols.rows.map((c: { column_name: string }) => c.column_name);
      const hasCorr = names.includes("correlation_id");
      const hasEvent = names.includes("event_id") || names.includes("aggregate_id");
      console.log(`LEDGER_TABLE ${table_name}`, names.slice(0, 20));
      if (hasCorr) {
        const r = await pool.query(
          `SELECT * FROM ${table_name} ORDER BY 1 DESC LIMIT 5`,
        );
        console.log(`RECENT_${table_name}`, JSON.stringify(r.rows, null, 2).slice(0, 4000));
      } else if (hasEvent) {
        const eventCol = names.includes("event_id") ? "event_id" : "aggregate_id";
        const r = await pool.query(
          `SELECT * FROM ${table_name} WHERE ${eventCol}=$1 ORDER BY 1 DESC LIMIT 5`,
          [eventId],
        );
        console.log(`EVENT_${table_name}`, JSON.stringify(r.rows, null, 2).slice(0, 4000));
      }
    } catch (e) {
      console.log(`LEDGER_TABLE ${table_name} ERR`, (e as Error).message.split("\n")[0]);
    }
  }

  // baseline adoption unchanged
  for (const t of ["cpsat_adoption", "seating_adoption", "cpsat_current_publication", "cpsat_publication"]) {
    try {
      const r = await pool.query(`SELECT * FROM ${t} WHERE id=$1 OR event_id=$1 LIMIT 3`, [adoptionId]);
      if (r.rows.length) console.log(`ADOPT_${t}`, JSON.stringify(r.rows, null, 2).slice(0, 2000));
      const r2 = await pool.query(`SELECT * FROM ${t} WHERE event_id=$1 LIMIT 5`, [eventId]);
      if (r2.rows.length) console.log(`EVENT_${t}`, JSON.stringify(r2.rows, null, 2).slice(0, 2000));
    } catch (e) {
      console.log(`ADOPT_${t} ERR`, (e as Error).message.split("\n")[0]);
    }
  }

  void runId;
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
